export class PaginatedPropertyMapping {

    static mapDatabaseEntriesToPaginatedIdentifiers(result) {
        const lastItem = result[result.length - 1];
        return {
            identifiers: result.map(item => item.id),
            lastEvaluatedKey: {
                createdAt: lastItem.createdat,
                id: lastItem.id,
            },
        };
    }
}
