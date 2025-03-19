const handleSubmit = async () => {
    try {
        setIsLoading(true);
        const AccoID = formData.ID;
        const updatedFormData = {...formData};

        // Upload images and generate URLs
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            if (file) {
                await uploadImagesInDifferentSizes(file, userId, AccoID, i);
                updatedFormData.Images[`image${i + 1}`] = constructURL(userId, AccoID, i, 'mobile');
                updatedFormData.Images[`image${i + 1}`] = constructURL(userId, AccoID, i, 'homepage');
                updatedFormData.Images[`image${i + 1}`] = constructURL(userId, AccoID, i, 'detail');
            }
        }

        await setFormData(updatedFormData); 
        setImageFiles([]);


        const endpoint = isNew ? 'CreateAccomodation' : 'EditAccommodation';
        const method = isNew ? 'POST' : 'PUT';

        const response = await fetch(`https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/${endpoint}`, {
            method: method,
            body: JSON.stringify(updatedFormData),
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            console.log(isNew ? 'Accommodation created successfully' : 'Accommodation updated successfully');
        } else {
            console.error('Error saving form data');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        setIsLoading(false);
    }
};





















const handleUpdate = async () => {
    try {
        setIsLoading(true);
        const AccoID = formData.ID;
        const updatedFormData = {...formData};

        for (let i = 0; i < updatedIndex.length; i++) {
            const index = updatedIndex[i];
            await removeImageFromS3(userId, AccoID, index);
        }

        for (let i = 0; i < updatedIndex.length; i++) {
            const index = updatedIndex[i];
            const file = imageFiles[index];
            if (file) {
                await uploadImagesInDifferentSizes(file, userId, AccoID, index);
                updatedFormData.Images[`image${index + 1}`] = constructURL(userId, AccoID, index, 'mobile');
                updatedFormData.Images[`image${index + 1}`] = constructURL(userId, AccoID, index, 'homepage');
                updatedFormData.Images[`image${index + 1}`] = constructURL(userId, AccoID, index, 'detail');
            }
        }

        const response = await fetch('https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/EditAccommodation', {
            method: 'PUT',
            body: JSON.stringify(updatedFormData),
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            console.log('Accommodation updated successfully');
        } else {
            console.error('Error updating accommodation');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        setIsLoading(false);
    }
};
