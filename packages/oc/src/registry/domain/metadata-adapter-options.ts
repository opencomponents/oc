import type { MetadataConfig } from '../../types';

type MetadataOptionsConfig = {
  metadata?: Pick<MetadataConfig, 'manageSchema' | 'options'>;
};

const getMetadataAdapterOptions = (conf: MetadataOptionsConfig): any => {
  if (typeof conf.metadata?.manageSchema === 'undefined') {
    return conf.metadata?.options;
  }

  return {
    ...(conf.metadata.options || {}),
    manageSchema: conf.metadata.manageSchema
  };
};

export default getMetadataAdapterOptions;
