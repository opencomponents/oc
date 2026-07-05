import path from 'node:path';
import { promisify } from 'node:util';
import { Storage, type UploadOptions } from '@google-cloud/storage';
import fs from 'fs-extra';
import Cache from 'nice-cache';
import nodeDir, { type PathsResult } from 'node-dir';
import {
  getFileInfo,
  type StorageAdapter,
  type StorageAdapterBaseConfig,
  strings
} from 'oc-storage-adapters-utils';
import tmp from 'tmp';

const getPaths: (path: string) => Promise<PathsResult> = promisify(
  nodeDir.paths
);

export interface GsConfig extends StorageAdapterBaseConfig {
  /**
   * Name of the Google Cloud Storage bucket that will host the component files.
   */
  bucket: string;
  /**
   * Google Cloud project ID that owns the bucket.
   */
  projectId: string;
  /**
   * Cache-Control max-age (in seconds) to apply to public files. If not set, defaults to 3600.
   * Optional.
   */
  maxAge?: boolean;
}

export default function gsAdapter(conf: GsConfig): StorageAdapter {
  const isValid = () => {
    if (!conf.bucket || !conf.projectId || !conf.path) {
      return false;
    }
    return true;
  };

  let client: Storage | undefined;

  const getClient = () => {
    if (!client) {
      client = new Storage({
        projectId: conf.projectId
      });
    }
    return client;
  };

  const bucketName = conf.bucket;
  const cache = new Cache({
    verbose: !!conf.verbosity,
    refreshInterval: conf.refreshInterval
  });

  const getFile = async (filePath: string, force = false) => {
    const getFromGs = async () => {
      try {
        const data = await getClient()
          .bucket(bucketName)
          .file(filePath)
          .download();

        return data.toString();
      } catch (err) {
        if ((err as any).code === 404) {
          throw {
            code: strings.errors.STORAGE.FILE_NOT_FOUND_CODE,
            msg: strings.errors.STORAGE.FILE_NOT_FOUND(filePath)
          };
        }
        throw {
          code: (err as any).code,
          msg: (err as any).message || (err as any).msg
        };
      }
    };

    if (force) {
      return getFromGs();
    }

    const cached = cache.get('gs-file', filePath);
    if (cached) {
      return cached;
    }

    const result = await getFromGs();
    cache.set('gs-file', filePath, result);
    cache.sub('gs-file', filePath, getFromGs);

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
        : dir + '/';

    try {
      const collected: { name: string }[] = [];
      let pageToken: string | undefined;

      do {
        const requestPageToken = pageToken;
        const options: {
          prefix: string;
          autoPaginate: false;
          pageToken?: string;
        } = {
          prefix: normalisedPath,
          autoPaginate: false
        };
        if (requestPageToken) {
          options.pageToken = requestPageToken;
        }

        const results = await getClient().bucket(bucketName).getFiles(options);
        const files = results[0] ?? [];
        const nextQuery = results[1] as { pageToken?: string } | undefined;

        for (const file of files) {
          collected.push(file);
        }

        const nextPageToken = nextQuery?.pageToken;
        if (nextPageToken && nextPageToken === requestPageToken) {
          throw new Error(
            'GCS getFiles returned an unchanged pageToken; aborting to avoid an infinite loop'
          );
        }
        pageToken = nextPageToken;
      } while (pageToken);

      if (collected.length === 0) {
        throw 'no files';
      }

      const result = collected
        //remove prefix
        .map((file) => file.name.replace(normalisedPath, ''))
        // only get files that aren't in root directory
        .filter((file) => file.split('/').length > 1)
        //get directory names
        .map((file) => file.split('/')[0])
        // reduce to unique directories
        .filter((item, i, ar) => ar.indexOf(item) === i);

      return result;
    } catch (_err) {
      throw {
        code: strings.errors.STORAGE.DIR_NOT_FOUND_CODE,
        msg: strings.errors.STORAGE.DIR_NOT_FOUND(dir)
      };
    }
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
    fileContent: string,
    fileName: string,
    isPrivate: boolean,
    client: Storage
  ) => {
    const tmpobj = tmp.fileSync();

    fs.writeFileSync(tmpobj.name, fileContent);

    try {
      const result = await putFile(tmpobj.name, fileName, isPrivate, client);
      return result;
    } finally {
      tmpobj.removeCallback();
    }
  };

  const putFile = async (
    filePath: string,
    fileName: string,
    isPrivate: boolean,
    client: Storage
  ) => {
    const fileInfo = getFileInfo(fileName);
    const obj: {
      ACL: 'authenticated-read' | 'public-read';
      ContentType?: string;
      Bucket: string;
      Key: string;
      ContentEncoding?: string;
    } = {
      ACL: isPrivate ? 'authenticated-read' : 'public-read',
      ContentType: fileInfo.mimeType,
      Bucket: bucketName,
      Key: fileName
    };

    if (fileInfo.gzip) {
      obj.ContentEncoding = 'gzip';
    }

    const options: UploadOptions = {
      destination: fileName,
      gzip: fileInfo.gzip
    };

    if (!isPrivate) {
      const maxAge = conf.maxAge || 3600;
      options.metadata = {
        cacheControl: `public, max-age=${maxAge}`
      };
    }

    const localClient = client ? client : getClient();
    try {
      await localClient.bucket(bucketName).upload(filePath, options);

      if (obj.ACL === 'public-read') {
        await localClient.bucket(bucketName).file(fileName).makePublic();
      }

      return obj;
    } catch (err) {
      throw { code: (err as any).code, msg: (err as any).message };
    }
  };

  const removeDir = async (dir: string) => {
    const removeFromContainer = async () => {
      const normalisedPath =
        dir.lastIndexOf('/') === dir.length - 1 && dir.length > 0
          ? dir
          : `${dir}/`;

      const collected: { delete: () => Promise<unknown> }[] = [];
      let pageToken: string | undefined;

      do {
        const requestPageToken = pageToken;
        const options: {
          prefix: string;
          autoPaginate: false;
          pageToken?: string;
        } = {
          prefix: normalisedPath,
          autoPaginate: false
        };
        if (requestPageToken) {
          options.pageToken = requestPageToken;
        }

        const results = await getClient().bucket(bucketName).getFiles(options);
        const files = results[0] ?? [];
        const nextQuery = results[1] as { pageToken?: string } | undefined;

        for (const file of files) {
          collected.push(file as { delete: () => Promise<unknown> });
        }

        const nextPageToken = nextQuery?.pageToken;
        if (nextPageToken && nextPageToken === requestPageToken) {
          throw new Error(
            'GCS getFiles returned an unchanged pageToken; aborting to avoid an infinite loop'
          );
        }
        pageToken = nextPageToken;
      } while (pageToken);

      return Promise.all(collected.map((file) => file.delete()));
    };

    return removeFromContainer();
  };

  const removeFile = async (filePath: string) => {
    const client = getClient();

    return client.bucket(bucketName).file(filePath).delete();
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
    removeDir,
    removeFile,
    adapterType: 'gs',
    isValid
  };
}

module.exports = gsAdapter;
