module.exports = ({ component }) => () =>
  !component.oc.state
    ? ''
    : `<span class="details-state">
     <span class="component-state-${component.oc.state.toLowerCase()}">
       ${component.oc.state}
     </span>
   </span>`;
