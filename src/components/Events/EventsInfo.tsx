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
import { fetchEventById as fetchTicketmasterEventById } from "@/utils/Events/fetchEventByID";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PredictHQEventData from "@/lib/predictHqEvent";

interface EventsInfoProps {
  eventId?: string;
  source: EventType;
  onClose: () => void;
  predictHQEventData?: PredictHQEventData;
}

const SkeletonEventDetails = () => (
  <div>
    <Skeleton className="w-full h-48 mb-6 rounded-xl" />
    <Skeleton className="w-3/4 h-6 mb-4" />
    <Skeleton className="w-1/2 h-4 mb-4" />
    <Skeleton className="w-2/3 h-4 mb-6" />
    <div className="mb-6">
      <Skeleton className="w-2/3 h-6 mb-2" />
      <Skeleton className="w-1/2 h-4" />
    </div>
    <div className="mb-6">
      <Skeleton className="w-2/3 h-6 mb-2" />
      <Skeleton className="w-1/2 h-4" />
    </div>
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
  predictHQEventData,
}) => {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      let eventData = null;

      try {
        if (source === "TICKETMASTER" && eventId) {
          eventData = await fetchTicketmasterEventById(eventId);
        }

        setEvent(eventData);
      } catch (err) {
        console.error(`Error fetching event from ${source}:`, err);
        setError("Failed to load event details.");
      }

      setLoading(false);
    };

    if (source === "TICKETMASTER") {
      fetchEventDetails();
    } else if (source === "PREDICTHQ" && predictHQEventData) {
      setEvent(predictHQEventData);
      setLoading(false);
    }
  }, [eventId, source, predictHQEventData]);

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
            {loading
              ? "Loading..."
              : event?.event?.name ||
                event?.event?.title ||
                event?.title ||
                "No Event Found"}
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <div className="h-[50vh] sm:h-[80vh] overflow-y-auto p-4">
            {loading ? (
              <SkeletonEventDetails />
            ) : event ? (
              <>
                {/* Ticketmaster Data */}
                {source === "TICKETMASTER" && (
                  <>
                    {/* Event Images */}
                    <div className="mb-6">
                      {event?.event?.images &&
                        event?.event?.images.length > 0 && (
                          <Image
                            key={getLargestImage(event?.event?.images)?.url}
                            src={
                              getLargestImage(event?.event?.images)?.url || ""
                            }
                            alt={event?.event?.name}
                            width={1000}
                            height={300}
                            className="w-full h-[300px] object-cover rounded-xl mb-4"
                          />
                        )}
                    </div>

                    {event?.event?.description && (
                      <div className="mb-6">
                        <p className="text-sm">{event?.event?.description}</p>
                      </div>
                    )}

                    {/* Event Dates */}
                    <div className="mb-6">
                      <h2 className="text-lg sm:text-xl font-semibold mb-2">
                        Event Dates
                      </h2>
                      <p className="text-xs sm:text-sm">
                        <strong>Event Start:</strong>{" "}
                        {formatDate(event?.event?.dates.start.dateTime || "")}
                      </p>
                      {event?.event?.dates.end?.dateTime && (
                        <p className="text-xs sm:text-sm">
                          <strong>Event End:</strong>{" "}
                          {formatDate(event?.event?.dates.end.dateTime)}
                        </p>
                      )}
                    </div>

                    {/* Price Range */}
                    {/* {event?.event?.priceRanges?.[0]?.min &&
                    event?.event?.priceRanges?.[0]?.max && (
                      <div className="mb-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-2">
                          Ticket Pricing
                        </h2>
                        {event?.event?.priceRanges?.map((priceRange, index) => (
                          <p key={index} className="text-xs sm:text-sm">
                            <strong>
                              {priceRange.currency} {priceRange.min} -{" "}
                              {priceRange.max}
                            </strong>
                          </p>
                        ))}
                      </div>
                    )} */}

                    {/* Ticket Limit */}
                    {event?.event?.ticketLimit && (
                      <div className="mb-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-2">
                          Ticket Limit
                        </h2>
                        <p className="text-xs sm:text-sm">
                          {event?.event?.ticketLimit.info}
                        </p>
                      </div>
                    )}

                    {/* Venue Information */}
                    {event?.event?._embedded?.venues?.[0] && (
                      <div className="mb-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-2">
                          Venue Information
                        </h2>
                        <p className="text-xs sm:text-sm">
                          <strong>Venue Name:</strong>{" "}
                          {event?.event?._embedded?.venues[0]?.name}
                        </p>
                        <p className="text-xs sm:text-sm">
                          <strong>Location:</strong>{" "}
                          {event?.event?._embedded?.venues[0]?.city?.name},{" "}
                          {event?.event?._embedded?.venues[0]?.country?.name}
                        </p>
                        <p className="text-xs sm:text-sm">
                          <strong>Address:</strong>{" "}
                          {event?.event?._embedded?.venues[0]?.address?.line1}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* PredictHQ Data */}
                {source === "PREDICTHQ" && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold mb-2">
                      {event?.title}
                    </h2>

                    {event?.description && (
                      <p className="text-sm mb-6">{event.description}</p>
                    )}

                    {/* Event Start Time */}
                    <div className="mb-6">
                      <h2 className="text-lg sm:text-xl font-semibold mb-2">
                        Event Dates
                      </h2>
                      <p className="text-xs sm:text-sm">
                        <strong>Start:</strong> {formatDate(event?.start)}
                      </p>
                    </div>

                    {/* Venue Details */}
                    {event?.venue && (
                      <div className="mb-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-2">
                          Venue Information
                        </h2>
                        <p className="text-xs sm:text-sm">
                          <strong>Venue:</strong> {event?.venue.name}
                        </p>
                        <p className="text-xs sm:text-sm">
                          <strong>Location:</strong> {event?.venue.location}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-center text-gray-500">
                No event details available.
              </p>
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
          {event?.event?.url && (
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
