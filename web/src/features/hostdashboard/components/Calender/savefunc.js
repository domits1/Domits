/**
    const asyncSaveDates = async () => {
        const body = {
            DateRanges: selectedRanges,
            MinimumStay: minimumStay,
            MinimumAdvanceReservation: minimumAdvanceReservation,
            MaximumStay: maximumStay,
            MaximumAdvanceReservation: maximumAdvanceReservation,
            ID: passedProp.ID
        };

        console.log(body);
        try {
            const response = await fetch('https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Update-AccommodationStayParameters', {
                method: 'PUT',
                body: JSON.stringify(body),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });
            if (!response.ok) {
                alert("Something went wrong, please try again later...");
                throw new Error('Failed to fetch');
            } else {
                const data = await response.json();
                const jsonData = JSON.parse(data.body);
                if (jsonData.updatedAttributes) {
                    const updatedAttributes = jsonData.updatedAttributes;
                    passedProp.DateRanges = updatedAttributes.DateRanges;
                    alert("Update successful!");
                } else {
                    alert("Something went wrong, please try again later...");
                    console.log("updatedAttributes is missing in the response");
                }
            }+
        } catch (error) {
            console.error("Unexpected error:", error);
        } finally {
            navigate(0);
        }
    };
*/