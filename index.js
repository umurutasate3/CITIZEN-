const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
 
const database_url = 'mongodb://localhost:27017/appointment';
mongoose.connect(database_url);
const db =mongoose.connection;
db.on('error',(err)=>{
  console.log(err)
})
db.once('open',()=>{
  console.log('Database is running.')
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Define schema and model for appointment bookings
const appointmentSchema = new mongoose.Schema({
  phone_number: String,
  full_name: String,
  date: String,
  time: String,
  reason: String,
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// USSD Endpoint
app.post('/ussd', (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  // Split the input text into a list
  const userResponse = text.split('*');

  // Determine USSD flow based on user response
  let response = '';

  if (text === '') {
    // Initial screen
    response = 'CON Welcome to Local Government Appointment Booking\n';
    response += '1. Book an appointment\n';
    response += '2. Exit';
  } else if (userResponse[0] === '1') {
    switch (userResponse.length) {
      case 1:
        // Ask for citizen's full name
        response = 'CON Enter your full name:';
        break;
      case 2:
        // Ask for preferred date of appointment
        response = `CON Hi ${userResponse[1]}, please enter your preferred date (e.g., 2024-10-15):`;
        break;
      case 3:
        // Ask for preferred time
        response = 'CON Enter preferred time (e.g., 10:00 AM):';
        break;
      case 4:
        // Ask for reason for appointment
        response = 'CON Enter reason for the appointment:';
        break;
      case 5:
        // Save appointment details to MongoDB
        const appointmentData = {
          phone_number: phoneNumber,
          full_name: userResponse[1],
          date: userResponse[2],
          time: userResponse[3],
          reason: userResponse[4],
        };

        // Save the data in the MongoDB database
        const newAppointment = new Appointment(appointmentData);
        newAppointment
          .save()
          .then(() => {
            response = `END Thank you ${userResponse[1]}! Your appointment is booked for ${userResponse[2]} at ${userResponse[3]}.`;
          })
          .catch((err) => {
            console.error(err);
            response = 'END Sorry, there was an error booking your appointment. Please try again later.';
          });
        break;
      default:
        response = 'END Invalid input. Please try again.';
        break;
    }
  } else {
    // If user selects option 2 or enters any other response
    response = 'END Thank you for using our service. Goodbye!';
  }

  // Send response back to the user
  res.send(response);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
