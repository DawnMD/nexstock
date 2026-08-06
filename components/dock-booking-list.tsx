"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActivityType } from "@/lib/order-utils";
import { api } from "@/trpc/react";
import { ActivityType } from "@/generated/prisma/enums";
import { format } from "date-fns";
import {
  CheckCircleIcon,
  LockIcon,
  LogInIcon,
  LogOutIcon,
  TruckIcon,
  UnlockIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";

export function DockBookingList({
  query,
  date,
}: {
  query?: string | null;
  date?: string | null;
}) {
  const [bookings] = api.order.getTodayDockSchedule.useSuspenseQuery({
    search: query,
    date,
  });

  if (bookings.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <Card>
          <CardContent>
            <div className="text-center font-medium">
              No dock bookings found
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => {
            const isCheckIn =
              booking.activities.find(
                (activity) => activity.activityType === ActivityType.CHECK_IN,
              ) ?? false;
            const isCheckOut =
              booking.activities.find(
                (activity) => activity.activityType === ActivityType.CHECK_OUT,
              ) ?? false;
            const isOpen =
              booking.activities.find(
                (activity) => activity.activityType === ActivityType.OPEN,
              ) ?? false;
            const isClosed =
              booking.activities.find(
                (activity) => activity.activityType === ActivityType.CLOSE,
              ) ?? false;

            return (
              <Card key={booking.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                      <TruckIcon className="text-primary h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="font-mono text-lg">
                        {booking.vehicleNumber}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {booking.driverName}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status and Type Badges */}
                  <div className="flex items-center justify-between">
                    <Badge
                      className="font-mono"
                      variant={
                        isCheckIn && !isOpen
                          ? "green"
                          : isOpen && !isClosed
                            ? "blue"
                            : isClosed && !isCheckOut
                              ? "red"
                              : isCheckOut
                                ? "yellow"
                                : "secondary"
                      }
                    >
                      {booking.activities.length === 0
                        ? "Not Checked In"
                        : getActivityType(booking.activities[0]?.activityType)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {booking.vehicleType.type}
                    </Badge>
                  </div>

                  {/* Vehicle Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dock:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {booking.dock.name}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order:</span>
                      <span className="font-mono text-xs">
                        {booking.orderId}
                      </span>
                    </div>
                    {isCheckIn && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Check-in Time:
                        </span>
                        <span className="text-xs">
                          {format(isCheckIn.createdAt, "dd MMM yyyy hh:mm a")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timeline Information */}
                  {(isOpen || isClosed || isCheckOut) && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="mb-2 text-sm font-medium">Timeline</div>
                      <div className="text-muted-foreground space-y-1 text-xs">
                        {isOpen && (
                          <div className="flex justify-between">
                            <span>Opened:</span>
                            <span>
                              {format(isOpen.createdAt, "dd MMM yyyy hh:mm a")}
                            </span>
                          </div>
                        )}
                        {isClosed && (
                          <div className="flex justify-between">
                            <span>Closed:</span>
                            <span>
                              {format(
                                isClosed.createdAt,
                                "dd MMM yyyy hh:mm a",
                              )}
                            </span>
                          </div>
                        )}
                        {isCheckOut && (
                          <div className="flex justify-between">
                            <span>Checked Out:</span>
                            <span>
                              {format(
                                isCheckOut.createdAt,
                                "dd MMM yyyy hh:mm a",
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {/* If no activity, show check in button */}
                    {booking.activities.length === 0 && (
                      <Button size="sm" className="flex-1" asChild>
                        <Link
                          href={`/dock-booking/${booking.orderId}/${booking.vehicleNumber}/check-in`}
                        >
                          <LogInIcon className="mr-1 h-3 w-3" />
                          Check In
                        </Link>
                      </Button>
                    )}
                    {/* If checked in, show open button */}
                    {isCheckIn && !isOpen && (
                      <Button size="sm" className="flex-1" asChild>
                        <Link
                          href={`/dock-booking/${booking.orderId}/${booking.vehicleNumber}/open`}
                        >
                          <UnlockIcon className="mr-1 h-3 w-3" />
                          Open
                        </Link>
                      </Button>
                    )}
                    {/* If open, show close button */}
                    {isOpen && !isClosed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                        asChild
                      >
                        <Link
                          href={`/dock-booking/${booking.orderId}/${booking.vehicleNumber}/close`}
                        >
                          <LockIcon className="mr-1 h-3 w-3" />
                          Close
                        </Link>
                      </Button>
                    )}
                    {/* If closed, show check out button */}
                    {isClosed && !isCheckOut && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                        asChild
                      >
                        <Link
                          href={`/dock-booking/${booking.orderId}/${booking.vehicleNumber}/check-out`}
                        >
                          <LogOutIcon className="mr-1 h-3 w-3" />
                          Check Out
                        </Link>
                      </Button>
                    )}
                    {/* If checked out, show complete badge */}
                    {isCheckOut && (
                      <div className="flex flex-1 items-center justify-center">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          disabled
                        >
                          <CheckCircleIcon className="mr-1 h-3 w-3" />
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
