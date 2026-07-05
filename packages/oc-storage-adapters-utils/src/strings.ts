export const errors = {
  generic: (error: string) => `An error occurred: ${error}`,
  STORAGE: {
    DIR_NOT_FOUND: (dir: string) => `Directory "${dir}" not found`,
    DIR_NOT_FOUND_CODE: 'dir_not_found',
    FILE_NOT_FOUND: (file: string) => `File "${file}" not found`,
    FILE_NOT_FOUND_CODE: 'file_not_found',
    FILE_NOT_VALID: (file: string) => `File "${file}" not valid`,
    FILE_NOT_VALID_CODE: 'file_not_valid'
  }
};
