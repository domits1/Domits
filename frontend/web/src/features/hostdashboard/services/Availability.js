

app.get("/:id", async (req, res) => {
    const event = { pathParameters: { id: req.params.id } };
    const response = await handler(event);
    res.status(response.statusCode).send(response.body);
});