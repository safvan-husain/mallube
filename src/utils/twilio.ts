import twilio from "twilio";
import { config } from "../config/vars";

const twilioclient = twilio(config.twilioAccountSid, config.twilioAuthtoken, {
  lazyLoading: true,
});

export async function sendTwilioOtp(phone: string) {
  try {
    if (!config.twilioServiceId) throw "service id not found";
    await twilioclient.verify.v2
      .services(config.twilioServiceId)
      .verifications.create({
        channel: "sms",
        to: `+91${phone}`,
      });
    return true;
  } catch (error) {
    throw error;
  }
}

export async function verifyTwilioOtp(phone: string, otp: string) {
  if (!config.twilioServiceId) throw "service id not found";
  const verifiedResponse = await twilioclient.verify.v2
    .services(config.twilioServiceId)
    .verificationChecks.create({
      code: otp,
      to: `+91${phone}`,
    });

  //mark user as verified if otp is verified true
  return verifiedResponse.status === "approved";
}
