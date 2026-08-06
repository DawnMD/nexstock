"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const qualityCheckPercentageValue = (
  qualityCheckPercentage: number,
  receivedQuantity: number,
) => {
  return Math.round((qualityCheckPercentage / 100) * receivedQuantity);
};

// The damaged ceiling depends on how much of the receipt is being inspected, so
// the schema is built per line rather than shared at module level. The server
// enforces the same rule; this is what puts the message under the field.
const buildQualityCheckFormSchema = (receivedQuantity: number) =>
  z
    .object({
      damagedQuantity: z.number().int().min(0),
      qualityCheckPercentage: z.number().int().min(1).max(100),
      qcNotes: z.string().optional(),
    })
    .refine(
      (data) =>
        data.damagedQuantity <=
        qualityCheckPercentageValue(
          data.qualityCheckPercentage,
          receivedQuantity,
        ),
      {
        message: "Damaged quantity cannot exceed the inspected quantity",
        path: ["damagedQuantity"],
      },
    );

type QualityCheckFormValues = z.infer<
  ReturnType<typeof buildQualityCheckFormSchema>
>;

export function QualityCheckProcess({
  receivedQuantity,
  orderNumber,
  orderItemNumber,
}: {
  receivedQuantity: number;
  orderNumber: string;
  orderItemNumber: string;
}) {
  const formSchema = useMemo(
    () => buildQualityCheckFormSchema(receivedQuantity),
    [receivedQuantity],
  );

  const form = useForm<QualityCheckFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      damagedQuantity: 0,
      qualityCheckPercentage: 100,
      qcNotes: "",
    },
  });

  const router = useRouter();
  const apiUtils = api.useUtils();
  const { mutate: updateQualityCheckStatus, isPending } =
    api.qualityCheck.updateQualityCheckStatus.useMutation({
      onSuccess: async () => {
        await Promise.all([
          apiUtils.order.getOrderDetailsByOrderNumber.invalidate(),
          apiUtils.qualityCheck.getOrderItems.invalidate(),
        ]);
        toast.success("Quality check status updated");
        router.replace(`/quality-check/${orderNumber}`);
      },
      onError: (error) => {
        toast.error("Failed to update quality check status", {
          description: error.message,
        });
      },
    });

  const onSubmit = (data: QualityCheckFormValues) => {
    updateQualityCheckStatus({
      id: Number(orderItemNumber),
      rejectedQuantity: data.damagedQuantity,
      inspectedQuantity: qualityCheckPercentageValue(
        data.qualityCheckPercentage,
        receivedQuantity,
      ),
      remarks: data.qcNotes ?? undefined,
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 lg:gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quantity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-100 p-3 text-center dark:bg-blue-900/30">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {receivedQuantity}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Received Qty
                </p>
              </div>
              <div className="rounded-lg bg-orange-100 p-3 text-center dark:bg-orange-900/30">
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {qualityCheckPercentageValue(
                    form.watch("qualityCheckPercentage"),
                    receivedQuantity,
                  )}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Inspection Qty
                </p>
              </div>
              <div className="rounded-lg bg-green-100 p-3 text-center dark:bg-green-900/30">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {qualityCheckPercentageValue(
                    form.watch("qualityCheckPercentage"),
                    receivedQuantity,
                  ) - form.watch("damagedQuantity")}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">Passed Qty</p>
              </div>
              <div className="rounded-lg bg-red-100 p-3 text-center dark:bg-red-900/30">
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {form.watch("damagedQuantity") || 0}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Damaged Qty
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Inspection Percentage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="qualityCheckPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">
                      Quality Check Percentage
                    </FormLabel>
                    <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={(value) => {
                          field.onChange(
                            Array.isArray(value) ? value[0] : value,
                          );
                          form.setValue("damagedQuantity", 0);
                        }}
                        max={100}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </FormControl>
                    <div className="space-y-3">
                      <div className="text-muted-foreground flex justify-between text-xs">
                        <span>1%</span>
                        <span>25%</span>
                        <span>65%</span>
                        <span>100%</span>
                      </div>
                      <div className="text-center">
                        <span className="text-primary text-2xl font-bold">
                          {field.value}
                        </span>
                        <span className="text-muted-foreground ml-1 text-base">
                          %
                        </span>
                      </div>
                      <FormDescription>
                        Inspecting{" "}
                        {qualityCheckPercentageValue(
                          field.value,
                          receivedQuantity,
                        )}{" "}
                        out of {receivedQuantity} units
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Damaged Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="damagedQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Damaged Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter damaged quantity"
                        {...field}
                        min={0}
                        max={qualityCheckPercentageValue(
                          form.getValues("qualityCheckPercentage"),
                          receivedQuantity,
                        )}
                        onChange={(e) => {
                          field.onChange(Number(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum:{" "}
                      {qualityCheckPercentageValue(
                        form.getValues("qualityCheckPercentage"),
                        receivedQuantity,
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">QC Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="qcNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">QC Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter detailed inspection notes, observations, or additional comments..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="flex flex-col-reverse gap-2 lg:flex-row lg:justify-end">
          <Button
            variant="destructive"
            type="button"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
