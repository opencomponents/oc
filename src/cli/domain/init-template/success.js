module.exports = (logger, componentName, componentPath) => {
  logger.ok(`Success! Created ${componentName} at ${componentPath}`);
  logger.log('');
  logger.log('From here you can run several commands:');
  logger.log('');
  logger.ok('  oc --help');
  logger.log('    To see a detailed list of all the commands available');
  logger.log('');
  logger.log('We suggest that you begin by typing:');
  logger.log('');
  logger.ok('  oc dev . 3030');
  logger.log('');
  logger.log(
    'If you have questions, issues or feedback about OpenComponents, please, join us on Gitter:'
  );
  logger.ok('  https://gitter.im/opentable/oc');
  logger.log('');
  logger.log('Happy coding!');
  logger.log('');
};
