"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "../ui";
import { EventData } from "@/lib/events";
import { fetchEventById } from "@/utils/Events/fetchEventByID";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface EventsInfoProps {
  eventId: string;
  source: EventType;
  onClose: () => void;
}

const SkeletonEventDetails = () => (
  <div>
    <Skeleton className="w-full h-48 mb-6 rounded-xl" />
    <Skeleton className="w-3/4 h-6 mb-4" />
    <Skeleton className="w-1/2 h-4 mb-4" />
    <Skeleton className="w-2/3 h-4 mb-6" />

    {/* Event Dates */}
    <div className="mb-6">
      <Skeleton className="w-2/3 h-6 mb-2" />
      <Skeleton className="w-1/2 h-4" />
    </div>

    {/* Ticket Pricing */}
    <div className="mb-6">
      <Skeleton className="w-2/3 h-6 mb-2" />
      <Skeleton className="w-1/2 h-4" />
    </div>

    {/* Ticket Limit */}
    <div className="mb-6">
      <Skeleton className="w-2/3 h-6 mb-2" />
      <Skeleton className="w-1/2 h-4" />
    </div>

    {/* Venue Information */}
    <div className="mb-6">
      <Skeleton className="w-2/3 h-6 mb-2" />
      <Skeleton className="w-1/2 h-4 mb-2" />
      <Skeleton className="w-3/4 h-4 mb-4" />
    </div>
    <div className="mb-6">
      <Skeleton className="w-full h-12 mb-2" />
    </div>
  </div>
);
const EventsInfo: React.FC<EventsInfoProps> = ({
  eventId,
  onClose,
  source,
}) => {
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  console.log(event);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch event details when the component mounts
  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      const { event, error } = await fetchEventById(eventId);
      if (error) setError(error);
      setEvent(event);
      setLoading(false);
    };

    fetchEventDetails();
  }, [eventId]);

  // Helper function to format dates
  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  const getLargestImage = (
    images: { width: number; height: number; url: string }[]
  ) => {
    if (images.length === 0) return null;

    return images.reduce((largest, current) =>
      current.width > largest.width ? current : largest
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-6">
        <DialogHeader>
          <DialogTitle className="text-3xl md:text-4xl">
            {loading ? "Loading..." : event?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <div className="h-[80vh] overflow-y-auto p-4">
            {loading ? (
              <SkeletonEventDetails />
            ) : (
              <>
                {source === "TICKETMASTER" && (
                  <>
                    {/* Event Images */}
                    <div className="mb-6">
                      {event?.images && event.images.length > 0 && (
                        <Image
                          key={getLargestImage(event.images)?.url}
                          src={getLargestImage(event.images)?.url || ""}
                          alt={event?.name}
                          width={1000}
                          height={300}
                          className="w-full h-[300px] object-cover rounded-xl mb-4"
                        />
                      )}
                    </div>

                    {event?.description && (
                      <div className="mb-6">
                        <p className="text-sm">{event?.description}</p>
                      </div>
                    )}

                    {/* Event Dates */}
                    <div className="mb-6">
                      <h2 className="text-lg sm:text-xl font-semibold mb-2">
                        Event Dates
                      </h2>
                      <p className="text-xs sm:text-sm">
                        <strong>Event Start:</strong>{" "}
                        {formatDate(event?.dates.start.dateTime || "")}
                      </p>
                      {event?.dates.end?.dateTime && (
                        <p className="text-xs sm:text-sm">
                          <strong>Event End:</strong>{" "}
                          {formatDate(event?.dates.end.dateTime)}
                        </p>
                      )}
                    </div>

                    {/* Price Range */}
                    {event?.priceRanges?.[0]?.min &&
                      event?.priceRanges?.[0]?.max && (
                        <div className="mb-6">
                          <h2 className="text-lg sm:text-xl font-semibold mb-2">
                            Ticket Pricing
                          </h2>
                          {event?.priceRanges?.map((priceRange, index) => (
                            <p key={index} className="text-xs sm:text-sm">
                              <strong>
                                {priceRange.currency} {priceRange.min} -{" "}
                                {priceRange.max}
                              </strong>
                            </p>
                          ))}
                        </div>
                      )}

                    {/* Ticket Limit */}
                    {event?.ticketLimit && (
                      <div className="mb-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-2">
                          Ticket Limit
                        </h2>
                        <p className="text-xs sm:text-sm">
                          {event?.ticketLimit.info}
                        </p>
                      </div>
                    )}

                    {/* Venue Information */}
                    {event?._embedded?.venues?.[0] && (
                      <div className="mb-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-2">
                          Venue Information
                        </h2>
                        <p className="text-xs sm:text-sm">
                          <strong>Venue Name:</strong>{" "}
                          {event?._embedded?.venues[0]?.name}
                        </p>
                        <p className="text-xs sm:text-sm">
                          <strong>Location:</strong>{" "}
                          {event?._embedded?.venues[0]?.city?.name},{" "}
                          {event?._embedded?.venues[0]?.country?.name}
                        </p>
                        <p className="text-xs sm:text-sm">
                          <strong>Address:</strong>{" "}
                          {event?._embedded?.venues[0]?.address?.line1}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          {event?.url && (
            <div className="absolute -bottom-1 w-full">
              <Button
                onClick={() => router.push(event?.url || "")}
                variant={"secondary"}
                className="w-full"
              >
                More Info: Event Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventsInfo;
