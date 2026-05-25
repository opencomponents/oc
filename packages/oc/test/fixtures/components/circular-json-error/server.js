export const data = (context, callback) => {
  const vm = { name: 'John doe' };
  vm.circular = vm;
  callback(null, vm);
};
