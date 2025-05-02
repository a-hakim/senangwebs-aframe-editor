import React from 'react';
import Select from 'react-select';
import Events from '../../lib/Events';

// Import custom SVG icons
import PerspectiveIcon from '../icons/PerspectiveIcon';
import LeftViewIcon from '../icons/LeftViewIcon';
import RightViewIcon from '../icons/RightViewIcon';
import TopViewIcon from '../icons/TopViewIcon';
import BottomViewIcon from '../icons/BottomViewIcon';
import BackViewIcon from '../icons/BackViewIcon';
import FrontViewIcon from '../icons/FrontViewIcon';

const options = [
  {
    value: 'perspective',
    event: 'cameraperspectivetoggle',
    payload: null,
    label: 'Perspective',
    icon: <PerspectiveIcon width="24" height="24" /> // Use custom icon
  },
  {
    value: 'ortholeft',
    event: 'cameraorthographictoggle',
    payload: 'left',
    label: 'Left View',
    icon: <LeftViewIcon width="24" height="24" /> // Use custom icon
  },
  {
    value: 'orthoright',
    event: 'cameraorthographictoggle',
    payload: 'right',
    label: 'Right View',
    icon: <RightViewIcon width="24" height="24" /> // Use custom icon
  },
  {
    value: 'orthotop',
    event: 'cameraorthographictoggle',
    payload: 'top',
    label: 'Top View',
    icon: <TopViewIcon width="24" height="24" /> // Use custom icon
  },
  {
    value: 'orthobottom',
    event: 'cameraorthographictoggle',
    payload: 'bottom',
    label: 'Bottom View',
    icon: <BottomViewIcon width="24" height="24" /> // Use custom icon
  },
  {
    value: 'orthoback',
    event: 'cameraorthographictoggle',
    payload: 'back',
    label: 'Back View',
    icon: <BackViewIcon width="24" height="24" /> // Use custom icon
  },
  {
    value: 'orthofront',
    event: 'cameraorthographictoggle',
    payload: 'front',
    label: 'Front View',
    icon: <FrontViewIcon width="24" height="24" /> // Use custom icon
  }
];

export default class CameraToolbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedCamera: 'perspective'
    };
    this.justChangedCamera = false;
  }

  componentDidMount() {
    Events.on('cameratoggle', (data) => {
      if (this.justChangedCamera) {
        // Prevent recursion.
        this.justChangedCamera = false;
        return;
      }
      // Check if the incoming data value exists in our options
      const isValidOption = options.some((opt) => opt.value === data.value);
      if (isValidOption) {
        this.setState({ selectedCamera: data.value });
      }
    });
  }

  onChange(option) {
    console.log('Selected Camera Option:', option);
    this.justChangedCamera = true;
    this.setState({ selectedCamera: option.value });
    Events.emit(option.event, option.payload);
  }

  render() {
    // Custom formatOption to render label and icon
    const formatOptionLabel = ({ label, icon }) => (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {icon}
        <span style={{ marginLeft: '8px' }}>{label}</span>
      </div>
    );

    return (
      <div id="cameraToolbar">
        <Select
          id="cameraSelect"
          classNamePrefix="select"
          options={options}
          value={options.find(
            (option) => option.value === this.state.selectedCamera
          )}
          isSearchable={false}
          onChange={this.onChange.bind(this)}
          formatOptionLabel={formatOptionLabel}
        />
      </div>
    );
  }
}
