"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ActivityType } from "@/generated/prisma/enums";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const activitySchema = z.object({
  notes: z.string().optional(),
  // Only the OPEN step inspects the container, and when it does the operator has
  // to say which it was. It was previously optional with an `undefined` default
  // rendered as `field.value ? "good" : "bad"`, so the form opened with **Bad**
  // pre-selected and an untouched submit silently recorded a damaged container.
  containerCondition: z.enum(["good", "bad"]).optional(),
});

export function VehicleActivityForm({
  vehicleNumber,
  activityType,
  orderNumber,
}: {
  vehicleNumber: string;
  activityType: ActivityType;
  orderNumber: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const updateDockActivity = useMutation(
    orpc.order.updateDockActivity.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.order.getTodayDockSchedule.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.qualityCheck.getOrderItems.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.qualityCheck.getQualityCheckItems.key(),
          }),
        ]);
        toast.success("Activity updated successfully");
        router.back();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update activity");
      },
    }),
  );

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      notes: "",
      containerCondition: undefined,
    },
  });

  const onSubmit = (data: z.infer<typeof activitySchema>) => {
    if (activityType === "OPEN" && !data.containerCondition) {
      form.setError("containerCondition", {
        type: "manual",
        message: "Record the container's condition before opening",
      });
      return;
    }

    updateDockActivity.mutate({
      vehicleNumber,
      activity: activityType,
      notes: data.notes,
      containerCondition: data.containerCondition === "good",
      orderNumber,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>
              Record container condition and any additional notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activityType === "OPEN" && (
              <FormField
                control={form.control}
                name="containerCondition"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        // No `defaultValue`: nothing is pre-selected, so the
                        // operator's choice is always a deliberate one.
                        value={field.value}
                        className="flex flex-row space-x-4"
                      >
                        <FormItem className="flex items-center space-y-0 space-x-2">
                          <FormControl>
                            <RadioGroupItem value="good" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Good Condition
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-y-0 space-x-2">
                          <FormControl>
                            <RadioGroupItem value="bad" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Bad Condition
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel htmlFor="notes">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional notes, special instructions, or observations..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
          <Button
            render={<Link href={"/dock-booking"} />}
            nativeButton={false}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={
              updateDockActivity.isPending || form.formState.isSubmitting
            }
            type="submit"
          >
            {updateDockActivity.isPending || form.formState.isSubmitting
              ? "Submitting..."
              : "Submit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
