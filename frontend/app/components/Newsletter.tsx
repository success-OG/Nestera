"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { zodFormResolver } from "../lib/formResolver";
import { reportError, trackEvent } from "../lib/analytics";

const Newsletter: React.FC = () => {
  const t = useTranslations();

  const newsletterSchema = z.object({
    email: z
      .string()
      .trim()
      .min(1, t("forms.required"))
      .email(t("forms.invalidEmail")),
  });
  type NewsletterFormValues = z.infer<typeof newsletterSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<NewsletterFormValues>({
    resolver: zodFormResolver(newsletterSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: NewsletterFormValues) => {
    try {
      console.log("Newsletter signup:", data.email);
      await Promise.resolve();
      trackEvent("form_submit_succeeded", { form: "newsletter" });
      reset();
    } catch (error) {
      reportError(error, { form: "newsletter" });
    }
  };

  return (
    <section className="bg-[#041c1e] py-16 px-8 flex justify-center items-center w-full">
      <div className="flex justify-between items-center w-full max-w-[1200px] flex-wrap gap-8 max-md:flex-col max-md:items-stretch max-md:text-center">
        <div className="flex-1 min-w-[280px]">
          <h2 className="text-white text-2xl font-semibold mb-2 leading-tight">
            {t("Newsletter.title")}
          </h2>
          <p className="text-gray-400 text-sm m-0">
            {t("Newsletter.description")}
          </p>
        </div>

        <form
          className="flex gap-3 flex-1 justify-end min-w-[320px] max-md:flex-col max-md:justify-center"
          onSubmit={handleSubmit(onSubmit)}
          aria-describedby={isSubmitSuccessful ? "newsletter-success" : undefined}
        >
          <div className="flex-1 max-w-[400px] max-md:max-w-full">
            <input
              type="email"
              {...register("email")}
              className={`w-full px-4 py-3 bg-[#020c0c] border border-[#1f3536] rounded-md text-white text-sm placeholder:text-gray-500 outline-none transition-colors duration-200 focus:border-[#00d1c1] box-border ${
                errors.email ? "border-red-500" : ""
              }`}
              placeholder={t("Newsletter.placeholder")}
              required
              aria-invalid={!!errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-red-500 mt-1" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-[#00d1c1] text-[#020c0c] border-none rounded-md text-sm font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("Newsletter.submit") + "..." : t("Newsletter.submit")}
          </button>
          {isSubmitSuccessful && (
            <p id="newsletter-success" className="mt-2 text-xs text-green-500" role="status">
              {t("Newsletter.success")}
            </p>
          )}
        </form>
      </div>
    </section>
  );
};

export default Newsletter;
