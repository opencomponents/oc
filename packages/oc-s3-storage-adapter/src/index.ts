import type { Agent as httpAgent } from 'node:http';
import type { Agent as httpsAgent } from 'node:https';
import path from 'node:path';
import { promisify } from 'node:util';
import { S3, type S3ClientConfig } from '@aws-sdk/client-s3';
import {
  NodeHttpHandler,
  type NodeHttpHandlerOptions
} from '@aws-sdk/node-http-handler';
import fs from 'fs-extra';
import _ from 'lodash';
import Cache from 'nice-cache';
import nodeDir, { type PathsResult } from 'node-dir';
import {
  getFileInfo,
  getNextYear,
  type StorageAdapter,
  type StorageAdapterBaseConfig,
  strings
} from 'oc-storage-adapters-utils';

const getPaths: (path: string) => Promise<PathsResult> = promisify(
  nodeDir.paths
);

type RequireAllOrNone<ObjectType, KeysType extends keyof ObjectType = never> = (
  | Required<Pick<ObjectType, KeysType>> // Require all of the given keys.
  | Partial<Record<KeysType, never>> // Require none of the given keys.
) &
  Omit<ObjectType, KeysType>; // The rest of the keys.

export type S3Config = StorageAdapterBaseConfig &
  RequireAllOrNone<
    {
      /** Name of the AWS S3 bucket where components will be stored. */
      bucket: string;
      /** AWS region where the bucket is located (e.g. "eu-west-1"). */
      region: string;
      /** AWS access key ID. Must be provided together with `secret`, or both omitted to use IAM role credentials. */
      key?: string;
      /** AWS secret access key. Must be provided together with `key`, or both omitted to use IAM role credentials. */
      secret?: string;
      /** When `false`, disables SSL for S3 requests. Defaults to `true`. Optional. */
      sslEnabled?: boolean;
      /** Force path-style URLs instead of virtual host style. Optional. */
      s3ForcePathStyle?: boolean;
      /** Socket timeout (in milliseconds) for S3 requests. Optional. */
      timeout?: number;
      /** Custom HTTP/HTTPS agent to use (e.g. proxy agent). Optional. */
      agentProxy?: httpAgent | httpsAgent;
      /** Custom S3 endpoint (useful for S3-compatible services or local testing). Optional. */
      endpoint?: string;
      /** When `true`, enables AWS SDK debug logging to the console. Optional. */
      debug?: boolean;
    },
    'key' | 'secret'
  >;

const streamToString = (stream: NodeJS.ReadableStream) =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

export default function s3Adapter(conf: S3Config): StorageAdapter {
  const isValid = () => {
    if (
      !conf.bucket ||
      !conf.region ||
      (conf.key && !conf.secret) ||
      (!conf.key && conf.secret)
    ) {
      return false;
    }
    return true;
  };

  // Defaults
  const accessKeyId = conf.key;
  const secretAccessKey = conf.secret;
  const region = conf.region;
  const bucket = conf.bucket ? conf.bucket : '';
  const sslEnabled = conf.sslEnabled !== false;
  const s3ForcePathStyle = !!conf.s3ForcePathStyle;

  const cache = new Cache({
    verbose: !!conf.verbosity,
    refreshInterval: conf.refreshInterval
  });

  let requestHandler: NodeHttpHandler | undefined;
  if (conf.agentProxy) {
    const handlerOptions: NodeHttpHandlerOptions = {
      connectionTimeout: conf.timeout || 10000
    };
    if (sslEnabled) {
      handlerOptions.httpAgent = conf.agentProxy as httpAgent;
    } else {
      handlerOptions.httpsAgent = conf.agentProxy as httpsAgent;
    }
    requestHandler = new NodeHttpHandler(handlerOptions);
  }

  let client: S3 | undefined;

  const getClient = () => {
    if (!client) {
      const configOpts: S3ClientConfig = {
        logger: conf.debug ? (console as any) : undefined,
        tls: sslEnabled,
        requestHandler,
        endpoint: conf.endpoint,
        region,
        forcePathStyle: s3ForcePathStyle
      };
      if (accessKeyId && secretAccessKey) {
        configOpts.credentials = {
          accessKeyId,
          secretAccessKey
        };
      }
      client = new S3(configOpts);
    }
    return client;
  };

  const getFile = async (filePath: string, force = false) => {
    const getFromAws = async () => {
      try {
        const data = await getClient().getObject({
          Bucket: bucket,
          Key: filePath
        });

        return streamToString(data.Body as any);
      } catch (err) {
        throw (err as any).code === 'NoSuchKey'
          ? {
              code: strings.errors.STORAGE.FILE_NOT_FOUND_CODE,
              msg: strings.errors.STORAGE.FILE_NOT_FOUND(filePath)
            }
          : err;
      }
    };

    if (force) {
      return getFromAws();
    }

    const cached = cache.get('s3-file', filePath);
    if (cached) {
      return cached;
    }

    const result = await getFromAws();
    cache.set('s3-file', filePath, result);
    cache.sub('s3-file', filePath, getFromAws);

    return result;
  };

  const getJson = async (filePath: string, force = false) => {
    const file = await getFile(filePath, force);

    try {
      return JSON.parse(file);
    } catch (_er) {
      throw {
        code: strings.errors.STORAGE.FILE_NOT_VALID_CODE,
        msg: strings.errors.STORAGE.FILE_NOT_VALID(filePath)
      };
    }
  };

  const getUrl = (componentName: string, version: string, fileName: string) =>
    `${conf.path}${componentName}/${version}/${fileName}`;

  const listSubDirectories = async (dir: string) => {
    const normalisedPath =
      dir.lastIndexOf('/') === dir.length - 1 && dir.length > 0
        ? dir
        : `${dir}/`;

    const prefixes: string[] = [];
    let marker: string | undefined;

    while (true) {
      const data = await getClient().listObjects({
        Bucket: bucket,
        Prefix: normalisedPath,
        Delimiter: '/',
        Marker: marker
      });

      for (const commonPrefix of data.CommonPrefixes ?? []) {
        if (commonPrefix.Prefix) {
          prefixes.push(commonPrefix.Prefix);
        }
      }

      if (!data.IsTruncated) {
        break;
      }

      const nextMarker =
        data.NextMarker ??
        data.Contents?.[data.Contents.length - 1]?.Key ??
        data.CommonPrefixes?.[data.CommonPrefixes.length - 1]?.Prefix;

      if (!nextMarker || nextMarker === marker) {
        throw new Error(
          'S3 listObjects returned no (or unchanged) pagination marker while truncated'
        );
      }

      marker = nextMarker;
    }

    if (prefixes.length === 0) {
      throw {
        code: strings.errors.STORAGE.DIR_NOT_FOUND_CODE,
        msg: strings.errors.STORAGE.DIR_NOT_FOUND(dir)
      };
    }

    const result = _.map(prefixes, (prefix) =>
      prefix.substr(
        normalisedPath.length,
        prefix.length - normalisedPath.length - 1
      )
    );

    return result;
  };

  const putDir = async (dirInput: string, dirOutput: string) => {
    const paths = await getPaths(dirInput);
    const packageJsonFile = path.join(dirInput, 'package.json');
    const files = paths.files.filter((file) => file !== packageJsonFile);
    const client = getClient();

    const filesResults = await Promise.all(
      files.map((file: string) => {
        const relativeFile = file.slice(dirInput.length);
        const url = (dirOutput + relativeFile).replace(/\\/g, '/');

        const serverPattern = /(\\|\/)server\.js/;
        const dotFilePattern = /(\\|\/)\..+/;
        const privateFilePatterns = [serverPattern, dotFilePattern];
        return putFile(
          file,
          url,
          privateFilePatterns.some((r) => r.test(relativeFile)),
          client
        );
      })
    );
    // Ensuring package.json is uploaded last so we can verify that a component
    // was properly uploaded by checking if package.json exists
    const packageJsonFileResult = await putFile(
      packageJsonFile,
      `${dirOutput}/package.json`.replace(/\\/g, '/'),
      false,
      client
    );

    return [...filesResults, packageJsonFileResult];
  };

  const putFileContent = async (
    fileContent: string | fs.ReadStream,
    fileName: string,
    isPrivate: boolean,
    client: S3
  ) => {
    const fileInfo = getFileInfo(fileName);
    const localClient = client ? client : getClient();

    return localClient.putObject({
      Bucket: bucket,
      Key: fileName,
      Body: fileContent,
      ContentType: fileInfo.mimeType,
      ContentEncoding: fileInfo.gzip ? 'gzip' : undefined,
      ACL: isPrivate ? 'authenticated-read' : 'public-read',
      ServerSideEncryption: 'AES256',
      Expires: getNextYear()
    });
  };

  const putFile = (
    filePath: string,
    fileName: string,
    isPrivate: boolean,
    client: S3
  ) => {
    const stream = fs.createReadStream(filePath);

    return putFileContent(stream, fileName, isPrivate, client);
  };

  const removeDir = async (dir: string) => {
    const removeFromContainer = async () => {
      const normalisedPath =
        dir.lastIndexOf('/') === dir.length - 1 && dir.length > 0
          ? dir
          : `${dir}/`;

      const files: string[] = [];
      let marker: string | undefined;

      while (true) {
        const data = await getClient().listObjects({
          Bucket: bucket,
          Prefix: normalisedPath,
          Marker: marker
        });

        for (const content of data.Contents ?? []) {
          if (content.Key != null) {
            files.push(content.Key);
          }
        }

        if (!data.IsTruncated) {
          break;
        }

        const nextMarker =
          data.NextMarker ?? data.Contents?.[data.Contents.length - 1]?.Key;

        if (!nextMarker || nextMarker === marker) {
          throw new Error(
            'S3 listObjects returned no (or unchanged) pagination marker while truncated'
          );
        }

        marker = nextMarker;
      }

      return Promise.all(files.map((file) => removeFile(file)));
    };

    return removeFromContainer();
  };

  const removeFile = async (filePath: string) => {
    const client = getClient();

    await client.deleteObject({
      Bucket: bucket,
      Key: filePath
    });
  };

  return {
    getFile,
    getJson,
    getUrl,
    listSubDirectories,
    maxConcurrentRequests: 20,
    putDir,
    putFile,
    putFileContent,
    removeFile,
    removeDir,
    adapterType: 's3',
    isValid
  };
}

module.exports = s3Adapter;
