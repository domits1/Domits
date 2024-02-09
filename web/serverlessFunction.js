exports.handler = async (event) => {
    const { request } = event.Records[0].cf;
    const { uri } = request;

    // Custom routing logic
    if (uri.startsWith('/admin')) {
        return {
            status: '302',
            statusDescription: 'Found',
            headers: {
                location: [{ key: 'Location', value: '/admindashboard/HomeDashboard.js' }],
            },
        };
    }

    // Default behavior
    return request;
};
