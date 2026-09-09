import type { OcHandler } from '../domain/http-server/types';
import type { Repository } from '../domain/repository';
import { isPrivateComponentFile } from '../domain/storage-adapter';
import * as versionHandler from '../domain/version-handler';

export default function componentStatic(repository: Repository): OcHandler {
  return async (req, res): Promise<void> => {
    const componentName = req.params['componentName'];
    const requestedVersion = req.params['componentVersion'];
    const filePath = req.params['splat'] ?? '';

    if (
      !filePath ||
      filePath.includes('\\') ||
      filePath.split('/').includes('..')
    ) {
      res.status(404).json({ err: 'File not found' });
      return;
    }

    if (isPrivateComponentFile(`/${filePath}`)) {
      res.status(404).json({ err: 'File not found' });
      return;
    }

    let versions: string[];
    try {
      versions = await repository.getComponentVersions(componentName);
    } catch {
      res.status(404).json({
        err: `Component "${componentName}" not found`
      });
      return;
    }

    if (!versions || versions.length === 0) {
      res.status(404).json({
        err: `Component "${componentName}" not found`
      });
      return;
    }

    const resolvedVersion = versionHandler.getAvailableVersion(
      requestedVersion,
      versions
    );

    if (!resolvedVersion) {
      res.status(404).json({
        err: `Component "${componentName}" with version "${requestedVersion}" not found`
      });
      return;
    }

    res.redirect(
      repository.getStaticFilePath(componentName, resolvedVersion, filePath)
    );
  };
}
