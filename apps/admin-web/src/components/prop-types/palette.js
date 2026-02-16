import PropTypes from 'prop-types';

export const palettePropTypes = {
  accent: PropTypes.string.isRequired,
  border: PropTypes.string.isRequired,
  surface: PropTypes.string.isRequired,
  surfaceMuted: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  textMuted: PropTypes.string.isRequired,
  onAccent: PropTypes.string.isRequired,
  error: PropTypes.string,
};
