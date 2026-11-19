import type { RegistryOptions, TransformInfo } from '../../src';

interface PublicInfo {
  name: string;
  version: string;
  team: string;
}

export const syncTransform: TransformInfo = ({ name, version }): PublicInfo => ({
  name,
  version,
  team: 'payments'
});

export const asyncTransform: TransformInfo = async ({
  name,
  version
}): Promise<PublicInfo> => ({ name, version, team: 'payments' });

export const options: Pick<RegistryOptions, 'discovery'> = {
  discovery: {
    transformInfo: ({ author, ...info }) => info
  }
};
