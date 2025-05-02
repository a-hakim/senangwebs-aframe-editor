import React from 'react';
import PropTypes from 'prop-types';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon'; // Assuming AwesomeIcon is in the parent directory
import ComponentsContainer from './ComponentsContainer';
import EntityRepresentation from '../EntityRepresentation';
import Events from '../../lib/Events';

export default class Sidebar extends React.Component {
  static propTypes = {
    entity: PropTypes.object,
    visible: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = { open: false };
  }

  componentDidMount() {
    Events.on('componentremove', (event) => {
      this.forceUpdate();
    });

    Events.on('componentadd', (event) => {
      this.forceUpdate();
    });
  }

  handleToggle = () => {
    this.setState({ open: !this.state.open });
  };

  handleClose = () => {
    Events.emit('togglesidebar', { which: 'attributes' });
  };

  render() {
    const entity = this.props.entity;
    const visible = this.props.visible;
    if (entity && visible) {
      return (
        <div id="sidebar">
          <ComponentsContainer entity={entity} />
        </div>
      );
    } else {
      return <div />;
    }
  }
}
