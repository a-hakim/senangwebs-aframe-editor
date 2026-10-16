import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

export default class Collapsible extends React.Component {
  static propTypes = {
    label: PropTypes.string,
    className: PropTypes.string,
    collapsed: PropTypes.bool,
    children: PropTypes.oneOfType([PropTypes.array, PropTypes.element])
      .isRequired,
    id: PropTypes.string
  };

  static defaultProps = {
    collapsed: false
  };

  constructor(props) {
    super(props);
    this.state = {
      collapsed: this.props.collapsed
    };
  }

  toggleVisibility = (event) => {
    // Don't collapse if we click on actions like clipboard
    if (event.target.closest('button, a, input, select, textarea')) return;
    this.setState({ collapsed: !this.state.collapsed });
  };

  render() {
    const rootClassNames = {
      collapsible: true,
      component: true,
      collapsed: this.state.collapsed
    };
    if (this.props.className) {
      rootClassNames[this.props.className] = true;
    }
    const rootClasses = clsx(rootClassNames);

    const contentClasses = clsx({
      content: true,
      hide: this.state.collapsed
    });

    return (
      <div id={this.props.id} className={rootClasses}>
        <div className="static" onClick={this.toggleVisibility}>
          <button
            type="button"
            className="collapse-toggle"
            aria-label={
              this.props.id === 'componentEntityHeader'
                ? 'Toggle entity properties'
                : 'Toggle ' + (this.props.label || 'component')
            }
            aria-expanded={!this.state.collapsed}
            onClick={() => this.setState({ collapsed: !this.state.collapsed })}
          >
            <span className="collapse-button" aria-hidden="true" />
          </button>
          {this.props.children[0]}
        </div>
        <div className={contentClasses}>{this.props.children[1]}</div>
      </div>
    );
  }
}
