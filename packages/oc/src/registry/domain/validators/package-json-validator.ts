import strings from '../../../resources';

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface PkgDetails {
  componentName: string;
  packageJson: { name?: string };
  context: {
    user?: string;
  };
  customValidator: (
    pkgJson: unknown,
    context: { user?: string }
  ) => ValidationResult | boolean;
}

export default function packageJsonValidator(
  pkgDetails: PkgDetails
): ValidationResult {
  if (pkgDetails.packageJson.name !== pkgDetails.componentName) {
    return {
      isValid: false,
      error: strings.errors.registry.COMPONENT_PUBLISHNAME_CONFLICT
    };
  }

  let result = pkgDetails.customValidator(
    pkgDetails.packageJson,
    pkgDetails.context
  );

  if (typeof result === 'boolean') {
    result = { isValid: result };

    if (!result.isValid) {
      result.error = 'unknown';
    }
  }

  return result;
}
