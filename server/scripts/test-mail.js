require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

const testMail = async () => {
    try {
        console.log('Testing Email Configuration...');
        console.log('User:', process.env.EMAIL_USER);
        console.log('Pass length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { 
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS 
            }
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: 'Test Moi Collector Email',
            text: 'This is a test email from the Moi Collector application.'
        });

        console.log('Success! Message sent: %s', info.messageId);
        process.exit(0);
    } catch (err) {
        console.error('Failed to send email. Error details:');
        console.error(err);
        process.exit(1);
    }
};

testMail();
