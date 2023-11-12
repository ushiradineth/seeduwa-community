import { z } from "zod";

import { env } from "@/env.mjs";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const messageRouter = createTRPCRouter({
  send: protectedProcedure.input(z.object({ recipient: z.string(), text: z.string() })).mutation(({ input }) => {
    const formData = new URLSearchParams();
    formData.append("user_id", env.SMS_USER_ID);
    formData.append("api_key", env.SMS_API_KEY);
    formData.append("sender_id", env.SMS_SENDER_ID);
    formData.append("to", input.recipient);
    formData.append("message", input.text);

    fetch("http://send.srilankandiver.com/api/v2/send.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        // @ts-expect-error SMS Gateway does not responde with an error code
        if (!response.ok || response.status === "unsuccess") {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json(); // or response.text() if the response is not JSON
      })
      .then((data) => {
        console.log("Request successful:", data);
        // user can preview the response
      })
      .catch((error) => {
        console.error("Request failed:", error);
      });
  }),
});
