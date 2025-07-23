"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const formSchema = z.object({
  orderNumber: z.string().min(2, {
    message: "Order number must be at least 2 characters.",
  }),
});

export function AddNewAdjustment() {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderNumber: "",
    },
  });

  const checkOrder = api.adjustments.checkOrder.useMutation({
    onSuccess: (data) => {
      router.push(`/adjustments/new/${data.orderNumber}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      form.reset();
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    checkOrder.mutate(values);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add New Adjustment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Adjustment</DialogTitle>
          <DialogDescription>
            Add a new adjustment to the order.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 lg:space-y-6"
          >
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234567890"
                      {...field}
                      disabled={checkOrder.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    This is the order number of the order you want to add an
                    adjustment to.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={checkOrder.isPending}>
                {checkOrder.isPending ? "Checking..." : "Check Order"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
