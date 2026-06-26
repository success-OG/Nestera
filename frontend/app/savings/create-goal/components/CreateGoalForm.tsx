"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useFormatter, useTranslations } from "next-intl";
import { Calendar, CircleDollarSign, Flag, Repeat, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const isFutureDate = (value: string) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date > today;
};

export default function CreateGoalForm() {
  const t = useTranslations("goals");
  const formsT = useTranslations("forms");
  const format = useFormatter();

  const createGoalSchema = z.object({
    goalName: z
      .string()
      .trim()
      .min(3, formsT("minLength", { min: 3 }))
      .max(50, formsT("maxLength", { max: 50 })),
    category: z.string().min(1, formsT("required")),
    targetAmount: z.string().refine((val) => Number(val) > 0, formsT("minValue")),
    startingAmount: z
      .string()
      .refine((val) => val === "" || Number(val) >= 0, formsT("nonNegative")),
    targetDate: z.string().refine(isFutureDate, formsT("futureDate")),
    frequency: z.string().min(1, formsT("required")),
    description: z.string().max(160, formsT("maxLength", { max: 160 })).optional(),
    autoSave: z.boolean(),
    routeToYield: z.boolean(),
  });

  type CreateGoalFormValues = z.infer<typeof createGoalSchema>;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<CreateGoalFormValues>({
    resolver: zodResolver(createGoalSchema),
    mode: "onChange",
    defaultValues: {
      goalName: "",
      category: "",
      targetAmount: "",
      startingAmount: "",
      targetDate: "",
      frequency: "",
      description: "",
      autoSave: true,
      routeToYield: true,
    },
  });

  const targetAmount = Number(watch("targetAmount") || 0);
  const targetDate = watch("targetDate");

  const onSubmit = async (data: CreateGoalFormValues) => {
    try {
      console.log("Create goal submitted:", data);
      await Promise.resolve();
      // Success - could show toast here
      reset();
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-14">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6"
        aria-describedby={isSubmitSuccessful ? "create-goal-success" : undefined}
      >
        <div className="rounded-2xl border border-white/5 bg-[#061a1a] p-6 md:p-8 space-y-5">
          <div>
            <label htmlFor="goalName" className="block text-sm font-semibold text-white mb-2">
              {t("goalName")}
            </label>
            <div className="relative">
              <Flag className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]" size={18} />
              <input
                id="goalName"
                {...register("goalName")}
                placeholder={t("goalNamePlaceholder")}
                className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 ${errors.goalName ? "border-red-500" : ""}`}
                aria-invalid={!!errors.goalName}
                aria-describedby={errors.goalName ? "goalName-error" : undefined}
              />
            </div>
            {errors.goalName && (
              <p id="goalName-error" role="alert" className="text-amber-400 text-xs mt-2 m-0">
                {errors.goalName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-white mb-2">
                {t("category")}
              </label>
              <select
                id="category"
                {...register("category")}
                className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-hidden focus:border-cyan-500/50 ${errors.category ? "border-red-500" : ""}`}
                aria-invalid={!!errors.category}
                aria-describedby={errors.category ? "category-error" : undefined}
              >
                <option value="">{t("selectCategory")}</option>
                {["General", "Travel", "Housing", "Education", "Emergency"].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p id="category-error" role="alert" className="text-amber-400 text-xs mt-2 m-0">
                  {errors.category.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="targetAmount" className="block text-sm font-semibold text-white mb-2">
                {t("targetAmount")}
              </label>
              <div className="relative">
                <CircleDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]" size={18} />
                <input
                  id="targetAmount"
                  {...register("targetAmount")}
                  inputMode="decimal"
                  placeholder={t("targetAmountPlaceholder")}
                  className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 ${errors.targetAmount ? "border-red-500" : ""}`}
                  aria-invalid={!!errors.targetAmount}
                  aria-describedby={errors.targetAmount ? "targetAmount-error" : undefined}
                />
              </div>
              {errors.targetAmount && (
                <p id="targetAmount-error" role="alert" className="text-amber-400 text-xs mt-2 m-0">
                  {errors.targetAmount.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="targetDate" className="block text-sm font-semibold text-white mb-2">
                {t("targetDate")}
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]" size={18} />
                <input
                  id="targetDate"
                  {...register("targetDate")}
                  type="date"
                  className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-hidden focus:border-cyan-500/50 ${errors.targetDate ? "border-red-500" : ""}`}
                  aria-invalid={!!errors.targetDate}
                  aria-describedby={errors.targetDate ? "targetDate-error" : undefined}
                />
              </div>
              {errors.targetDate && (
                <p id="targetDate-error" role="alert" className="text-amber-400 text-xs mt-2 m-0">
                  {errors.targetDate.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="frequency" className="block text-sm font-semibold text-white mb-2">
                {t("frequency")}
              </label>
              <div className="relative">
                <Repeat className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e8c96]" size={18} />
                <select
                  id="frequency"
                  {...register("frequency")}
                  className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-hidden focus:border-cyan-500/50 ${errors.frequency ? "border-red-500" : ""}`}
                  aria-invalid={!!errors.frequency}
                  aria-describedby={errors.frequency ? "frequency-error" : undefined}
                >
                  <option value="">{t("selectFrequency")}</option>
                  <option value="weekly">{t("weekly")}</option>
                  <option value="monthly">{t("monthly")}</option>
                </select>
              </div>
              {errors.frequency && (
                <p id="frequency-error" role="alert" className="text-amber-400 text-xs mt-2 m-0">
                  {errors.frequency.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="startingAmount" className="block text-sm font-semibold text-white mb-2">
              {t("startingAmount")}
            </label>
            <input
              id="startingAmount"
              {...register("startingAmount")}
              inputMode="decimal"
              placeholder="0"
              className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 px-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 ${errors.startingAmount ? "border-red-500" : ""}`}
              aria-invalid={!!errors.startingAmount}
              aria-describedby={errors.startingAmount ? "startingAmount-error" : undefined}
            />
            {errors.startingAmount && (
              <p id="startingAmount-error" role="alert" className="text-amber-400 text-xs mt-2 m-0">
                {errors.startingAmount.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-white mb-2">
              {t("description")}
            </label>
            <textarea
              id="description"
              {...register("description")}
              rows={3}
              placeholder={t("descriptionPlaceholder")}
              className={`w-full bg-[#0e2330] border border-white/5 rounded-xl py-3 px-4 text-white placeholder:text-[#4e7a86] focus:outline-hidden focus:border-cyan-500/50 ${errors.description ? "border-red-500" : ""}`}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "description-error" : undefined}
            />
            {errors.description && (
              <p id="description-error" role="alert" className="text-amber-400 text-xs mt-2 m-0">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <span className="text-sm font-semibold text-white">{t("autoSave")}</span>
              <input type="checkbox" {...register("autoSave")} className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <span className="text-sm font-semibold text-white">{t("routeToYield")}</span>
              <input type="checkbox" {...register("routeToYield")} className="h-5 w-5" />
            </label>
          </div>

          {isSubmitSuccessful && (
            <p id="create-goal-success" role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm font-semibold">
              {t("success")}
            </p>
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-[#061a1a] font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
            disabled={isSubmitting}
          >
            <ShieldCheck size={18} />
            {isSubmitting ? t("creating") : t("create")}
          </button>
        </div>

        <aside className="rounded-2xl border border-white/5 bg-[#0e2330] p-6 h-fit">
          <p className="text-xs font-bold uppercase tracking-widest text-[#6a8a93] m-0">{t("summary")}</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[#6a8a93] text-xs m-0">{t("targetAmount")}</p>
              <p className="text-white text-2xl font-bold m-0">
                {format.number(targetAmount || 0, { style: "currency", currency: "USD" })}
              </p>
            </div>
            <div>
              <p className="text-[#6a8a93] text-xs m-0">{t("targetDate")}</p>
              <p className="text-white font-semibold m-0">
                {targetDate ? format.dateTime(new Date(targetDate), { dateStyle: "medium" }) : t("notSet")}
              </p>
            </div>
            <p className="text-[#6a8a93] text-sm leading-relaxed m-0">{t("tips.realisticTimeline")}</p>
          </div>
        </aside>
      </form>
    </section>
  );
}
