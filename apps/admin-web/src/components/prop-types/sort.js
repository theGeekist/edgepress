import PropTypes from 'prop-types';

export const sortPropTypes = {
  sortBy: PropTypes.string,
  sortDir: PropTypes.oneOf(['asc', 'desc']),
  onSort: PropTypes.func.isRequired,
};
