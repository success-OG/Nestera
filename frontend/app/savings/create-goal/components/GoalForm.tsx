"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Calendar, CircleDollarSign, Flag, Sparkles } from "lucide-react";
import { zodFormResolver } from "../../../lib/formResolver";
import { reportError, trackEvent } from "../../../lib/analytics";

// Create validation schema
const goalFormSchema = z.object({
  goalName: z.string().min(1, "Please enter a goal name"),
  category: z.string().min(1, "Please select a category"),
  targetAmount: z.string().refine(val => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Target amount must be greater than 0"),
  targetDate: z.string().refine(val => {
    if (val === "") return false;
    const date = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, "Target date can’t be in the past"),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

export default function GoalForm() {
  const t = useTranslations("goals");
  const formsT = useTranslations("forms");

  // Create validation schema with translated messages
  const goalFormSchema = z.object({
    goalName: z.string().trim().min(3, formsT("minLength", { min: 3 })).max(50, formsT("maxLength", { max: 50 })),
    category: z.string().min(1, formsT("required")),
    targetAmount: z.string().refine(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, formsT("minValue")),
    targetDate: z.string().refine(val => {
      if (val === "") return false;
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, formsT("futureDate")),
  });

  type GoalFormValues = z.infer<typeof goalFormSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<GoalFormValues>({
    resolver: zodFormResolver(goalFormSchema),
    mode: "onChange",
    defaultValues: {
      goalName: "",
      category: "General",
      targetAmount: "",
      targetDate: "",
    },
  });

  const onSubmit = async (data: GoalFormValues) => {
    try {
      console.log("Form submitted:", data);
      await Promise.resolve();
      trackEvent("form_submit_succeeded", { form: "goal" });
    } catch (error) {
      reportError(error, { form: "goal" });
    }
  };

  return (
    <div id="goal-form" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-white/5 bg-linear-to-br from-[rgba(6,26,26,0.82)] to-[rgba(4,14,16,0.6)] shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-sm p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white m-0 tracking-tight">
                  {t("createGoal")}
                </h2>
                <p className="text-[#6a8a93] text-sm m-0 mt-2">
                  {t("tips.realisticTimeline")}
                </p>
              </div>
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                <Sparkles size={20} />
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  {t("goalName")}
                </label>
                <div className="relative">
                  <Flag className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]" size={18} />
                  <input
                    {...register("goalName")}
                    placeholder={t("goalNamePlaceholder")}
                    className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 transition-colors ${
                      errors.goalName ? "border-red-500" : ""
                    }`}
                    required
                    aria-invalid={!!errors.goalName ? "true" : "false"}
                    aria-describedby={errors.goalName ? "goalName-error" : undefined}
                  />
                </div>
                {errors.goalName && (
                  <p className="text-amber-400 text-xs mt-2 m-0" id="goalName-error">
                    {errors.goalName.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    {t("category")}
                  </label>
                  <select
                    {...register("category")}
                    className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-hidden focus:border-cyan-500/50 transition-colors ${
                      errors.category ? "border-red-500" : ""
                    }`}
                  >
                    {["General", "Security", "Travel", "Housing", "Education", "Tech"].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ),
                    )}
                  </select>
                  {errors.category && (
                    <p className="text-amber-400 text-xs mt-2 m-0">
                      {errors.category.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    {t("targetAmount")}
                  </label>
                  <div className="relative">
                    <CircleDollarSign
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]"
                      size={18}
                    />
                    <input
                      {...register("targetAmount")}
                      inputMode="decimal"
                      placeholder={t("targetAmountPlaceholder")}
                      className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 transition-colors ${
                        errors.targetAmount ? "border-red-500" : ""
                      }`}
                      required
                      aria-invalid={!!errors.targetAmount ? "true" : "false"}
                      aria-describedby={errors.targetAmount ? "targetAmount-error" : undefined}
                    />
                  </div>
                  {errors.targetAmount && (
                    <p className="text-amber-400 text-xs mt-2 m-0" id="targetAmount-error">
                      {errors.targetAmount.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  {t("targetDate")}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]" size={18} />
                  <input
                    {...register("targetDate")}
                    type="date"
                    className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 transition-colors ${
                      errors.targetDate ? "border-red-500" : ""
                    }`}
                    required
                    aria-invalid={!!errors.targetDate ? "true" : "false"}
                    aria-describedby={errors.targetDate ? "targetDate-error" : undefined}
                  />
                </div>
                {errors.targetDate && (
                  <p className="text-amber-400 text-xs mt-2 m-0" id="targetDate-error">
                    {errors.targetDate.message}
                  </p>
                )}
              </div>

              {isSubmitSuccessful && (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                  <p className="text-emerald-300 text-sm font-semibold m-0">
                    {t("success")}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
                <button
                  type="submit"
                  className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-[#061a1a] font-bold rounded-2xl transition-all shadow-[0_10px_20px_rgba(0,212,192,0.2)] active:scale-95 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("creating") : t("create")}
                </button>
                <p className="text-[#6a8a93] text-xs m-0">
                  {t("tips.startSmall")}
                </p>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-white/5 bg-[#0e2330] p-6 md:p-7">
            <h3 className="text-white font-bold text-lg m-0">
              {t("tips.title")}
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-[#6a8a93]">
              <li>
                <span className="text-white font-semibold">
                  {t("tips.realisticTimeline")}
                </span>
              </li>
              <li>
                <span className="text-white font-semibold">
                  {t("tips.startSmall")}
                </span>
              </li>
              <li>
                <span className="text-white font-semibold">
                  {t("tips.nameClearly")}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

