import Database from "database";

let pool = null;

export const handler = async (event) => {
    try {
        if (!pool) {
            pool = await Database.getInstance();
        }

        switch (event.httpMethod) {
            case "POST":
                const requestBody = JSON.parse(event.body);

                const taskRepository = pool.getRepository("Task"); 

                const newTask = taskRepository.create({
                    title: requestBody.title,
                    description: requestBody.description,
                    property: requestBody.property,
                    booking_reference: requestBody.bookingRef || null,
                    type: requestBody.type,
                    assignee: requestBody.assignee,
                    attachments: requestBody.attachments || null,
                    status: "Pending" 
                });

                await taskRepository.save(newTask);

                return {
                    statusCode: 201,
                    headers: {
                        "Access-Control-Allow-Origin": "*", 
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ 
                        message: "Task created successfully", 
                        task: newTask 
                    })
                };

            default:
                return {
                    statusCode: 404,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ error: "HTTP method not found. Use POST." })
                };
        }
    } catch (error) {
        console.error("Lambda error:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Something went wrong while saving the task.", details: error.message })
        };
    }
};
