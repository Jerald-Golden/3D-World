const express = require("express");
const app = express();
const path = require('path');
app.use(express.static(path.join("frontend")));

app.get('/', (req, res) => {
    res.sendFile(path.join("frontend", 'index.html'));
});


app.listen(5000, () => {
    console.log(`Server is running on http://localhost:5000`);
});
