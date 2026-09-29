const axios = require('axios');

async function test() {
  try {
    const response = await axios.post(
      'https://gw.prod.girostack.com/v1/virtual-accounts',
      {
        accountName: "Test User",
        category: "primary",
        currency: "NGN",
        emailAddress: "test@example.com"
      },
      {
        headers: {
          'x-giro-key': 'sk_live_YOUR_API_KEY_HERE',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("Success:", response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error Status:", error.response.status);
      console.error("Error Data:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

test();
