// Contact Service - Handles contact form submission to backend
const API_BASE_URL = "https://bugbtl25mj.execute-api.eu-north-1.amazonaws.com/sendEmail";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Validates the contact form data
 * @param {Object} formData - The form data to validate
 * @returns {Object} - { isValid: boolean, message: string }
 */
export const validateContactForm = (formData) => {
  // Check for empty fields first
  if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim() ||
      !formData.city.trim() || !formData.properties.trim() || !formData.comments.trim()) {
    return { isValid: false, message: "Please fill out all fields." };
  }

  // Check email separately for better user experience
  if (!formData.email.trim()) {
    return { isValid: false, message: "Please fill out all fields." };
  }

  if (!isValidEmail(formData.email)) {
    return { isValid: false, message: "Please enter a valid email address." };
  }

  return { isValid: true, message: "" };
};

/**
 * Sends contact form data to the backend
 * @param {Object} formData - The form data to send
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
export const sendContactForm = async (formData) => {
  const payload = {
    name: `${formData.firstName} ${formData.lastName}`,
    subject: `Property Inquiry from ${formData.firstName} ${formData.lastName}`,
    sourceEmail: formData.email,
    message: `Contact Form Submission:

First Name: ${formData.firstName}
Last Name: ${formData.lastName}
Email: ${formData.email}
Phone: ${formData.phone}
City/Region: ${formData.city}
Number of Properties: ${formData.properties}

Comments:
${formData.comments}`,
    attachments: [],
  };

  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error || "Unknown error" };
    }
  } catch (error) {
    console.error("Error sending contact form:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Handles the complete contact form submission process
 * @param {Object} formData - The form data to submit
 * @param {Function} setIsSubmitting - Function to set submitting state
 * @param {Function} setFeedbackMessage - Function to set feedback message
 * @param {Function} resetForm - Function to reset the form
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const handleContactFormSubmission = async (
  formData,
  setIsSubmitting,
  setFeedbackMessage,
  resetForm
) => {
  // Validate form
  const validation = validateContactForm(formData);
  if (!validation.isValid) {
    setFeedbackMessage(validation.message);
    return false;
  }

  setIsSubmitting(true);
  setFeedbackMessage("");

  try {
    const result = await sendContactForm(formData);

    if (result.success) {
      setFeedbackMessage("Message sent successfully! Please check your inbox for a response.");
      resetForm();
      return true;
    } else {
      setFeedbackMessage(`Failed to send message: ${result.error || "Unknown error"}`);
      return false;
    }
  } catch (error) {
    setFeedbackMessage("Error sending message: " + error.message);
    return false;
  } finally {
    setIsSubmitting(false);
  }
};
