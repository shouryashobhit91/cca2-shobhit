'use strict';

const app = require('./app');

// Render (and most hosts) assign the port through the environment.
// Hard-coding a port here is the usual reason a deploy starts and then fails.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Hostel Complaint Register listening on ${PORT}`));
