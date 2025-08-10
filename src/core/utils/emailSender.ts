import sgMail from '@sendgrid/mail'; // Use default import

// Set up SendGrid API Key
sgMail.setApiKey(process.env.SEND_GRID_KEY as string);

async function sendEmail(
  email: string,
  text: string,
  subject: string,
): Promise<void> {
  try {
    const msg = {
      to: email,
      from: process.env.SEND_GRID_EMAIL as string,
      subject: subject,
      html: text,
    };

    await sgMail.send(msg);
  } catch (error) {
    console.error(error, 'error');
    throw error;
  }
}

export default sendEmail;
