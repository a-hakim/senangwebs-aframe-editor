import React from 'react';
import EntityRepresentation from '../EntityRepresentation';
import { createEventScope } from '../../lib/Events';

export default class ViewportHUD extends React.Component {
  events = createEventScope();

  componentWillUnmount() {
    this.events.dispose();
  }

  constructor(props) {
    super(props);
    this.state = {
      hoveredEntity: null,
      selectedEntity: null
    };
  }

  componentDidMount() {
    this.events.on('scenereload', () => this.setState({ hoveredEntity: null }));
    this.events.on('raycastermouseenter', (el) => {
      this.setState({ hoveredEntity: el });
    });

    this.events.on('raycastermouseleave', () => {
      this.setState({ hoveredEntity: null });
    });
  }

  render() {
    return (
      <div id="viewportHud">
        <p>
          <EntityRepresentation entity={this.state.hoveredEntity} />
        </p>
      </div>
    );
  }
}
