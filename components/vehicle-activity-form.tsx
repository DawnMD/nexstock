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
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ActivityType } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const activitySchema = z.object({
  notes: z.string().optional(),
  containerCondition: z.boolean().optional(),
});

interface VehicleActivityFormProps {
  vehicleNumber: string;
  activityType: ActivityType;
}

export function VehicleActivityForm({
  vehicleNumber,
  activityType,
}: VehicleActivityFormProps) {
  const router = useRouter();
  const apiUtils = api.useUtils();

  const updateDockActivity = api.order.updateDockActivity.useMutation({
    onSuccess: async () => {
      await apiUtils.order.getTodayDockSchedule.invalidate();
      toast.success("Activity updated successfully");
      router.back();
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to update activity");
    },
  });

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      notes: "",
      containerCondition: undefined,
    },
  });

  const onSubmit = (data: z.infer<typeof activitySchema>) => {
    updateDockActivity.mutate({
      vehicleNumber,
      activity: activityType,
      notes: data.notes,
      containerCondition: data.containerCondition,
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
                        onValueChange={(value) =>
                          field.onChange(value === "good")
                        }
                        defaultValue={field.value ? "good" : "bad"}
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
          <Button asChild type="button" variant="outline">
            <Link href={"/dock-booking"}>Cancel</Link>
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
