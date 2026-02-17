import PropTypes from "prop-types";

export const optionShape = PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
});

export const countryCodeShape = PropTypes.shape({
    code: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
});

export const authStatusShape = PropTypes.shape({
    emailVerified: PropTypes.bool.isRequired,
    phoneVerified: PropTypes.bool.isRequired,
    preferredMFA: PropTypes.string.isRequired,
});

export const userShape = PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
    address: PropTypes.string,
    phone: PropTypes.string,
    family: PropTypes.string,
    title: PropTypes.string,
    dateOfBirth: PropTypes.string,
    placeOfBirth: PropTypes.string,
    sex: PropTypes.string,
    picture: PropTypes.string,
    nationality: PropTypes.string,
});

export const tempUserShape = PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
    phone: PropTypes.string,
    title: PropTypes.string,
    dateOfBirth: PropTypes.string,
    placeOfBirth: PropTypes.string,
    sex: PropTypes.string,
    picture: PropTypes.string,
    nationality: PropTypes.string,
});

export const editStateShape = PropTypes.shape({
    email: PropTypes.bool,
    name: PropTypes.bool,
    phone: PropTypes.bool,
    dateOfBirth: PropTypes.bool,
    placeOfBirth: PropTypes.bool,
    nationality: PropTypes.bool,
});

export const refShape = PropTypes.shape({
    current: PropTypes.any,
});
