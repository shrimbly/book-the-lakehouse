"use client";

import {
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import { deleteStayPhoto, uploadStayPhoto } from "@/app/actions";
import type { Photo } from "@/lib/data";
import { processImage } from "@/lib/image";

export type PhotoContext = {
  bookingId: string;
  date: string;
  mode: "view" | "upload";
};

type PhotoAction =
  | { type: "add"; photo: Photo }
  | { type: "remove"; id: string }
  | { type: "replace"; tempId: string; photo: Photo };

export function useStayPhotos({
  initialPhotos,
  meId,
  setServerError,
}: {
  initialPhotos: Photo[];
  meId: string;
  setServerError: Dispatch<SetStateAction<string | null>>;
}) {
  const [, startPhotoTransition] = useTransition();
  const [photoContext, setPhotoContext] = useState<PhotoContext | null>(null);
  const [photoPending, setPhotoPending] = useState(false);
  const [optimisticPhotos, dispatchPhotos] = useOptimistic<
    Photo[],
    PhotoAction
  >(initialPhotos, (state, action) => {
    if (action.type === "add") return [...state, action.photo];
    if (action.type === "remove")
      return state.filter((photo) => photo.id !== action.id);
    if (action.type === "replace") {
      return state.map((photo) =>
        photo.id === action.tempId ? action.photo : photo,
      );
    }
    return state;
  });

  const photosByDate = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const photo of optimisticPhotos) {
      const list = map.get(photo.date) ?? [];
      list.push(photo);
      map.set(photo.date, list);
    }
    return map;
  }, [optimisticPhotos]);

  function handleUploadPhoto(bookingId: string, date: string, file: File) {
    setServerError(null);
    setPhotoPending(true);
    startPhotoTransition(async () => {
      let processed;
      try {
        processed = await processImage(file);
      } catch {
        setPhotoPending(false);
        setServerError("Couldn't read that image");
        return;
      }

      const tempId = `tmp-${crypto.randomUUID()}`;
      const tempThumb = URL.createObjectURL(processed.thumbnail);
      const tempFull = URL.createObjectURL(processed.full);

      dispatchPhotos({
        type: "add",
        photo: {
          id: tempId,
          bookingId,
          uploaderId: meId,
          date,
          url: tempFull,
          thumbnailUrl: tempThumb,
          caption: null,
          createdAt: new Date().toISOString(),
        },
      });

      const formData = new FormData();
      formData.append(
        "file",
        new File([processed.full], "photo.jpg", { type: "image/jpeg" }),
      );
      formData.append(
        "thumbnail",
        new File([processed.thumbnail], "photo-thumb.jpg", {
          type: "image/jpeg",
        }),
      );

      try {
        const result = await uploadStayPhoto(bookingId, date, formData);
        setPhotoPending(false);
        if ("error" in result) {
          setServerError(result.error);
          dispatchPhotos({ type: "remove", id: tempId });
        } else {
          dispatchPhotos({
            type: "replace",
            tempId,
            photo: {
              id: result.id,
              bookingId,
              uploaderId: meId,
              date,
              url: result.url,
              thumbnailUrl: result.thumbnailUrl,
              caption: null,
              createdAt: new Date().toISOString(),
            },
          });
        }
      } catch {
        setPhotoPending(false);
        setServerError("Upload failed — please try again");
        dispatchPhotos({ type: "remove", id: tempId });
      }

      URL.revokeObjectURL(tempThumb);
      URL.revokeObjectURL(tempFull);
    });
  }

  function handleDeletePhoto(photoId: string) {
    setServerError(null);
    setPhotoPending(true);
    startPhotoTransition(async () => {
      dispatchPhotos({ type: "remove", id: photoId });
      const result = await deleteStayPhoto(photoId);
      setPhotoPending(false);
      if ("error" in result) {
        setServerError(result.error);
      }
    });
  }

  return {
    optimisticPhotos,
    photosByDate,
    photoContext,
    setPhotoContext,
    photoPending,
    handleUploadPhoto,
    handleDeletePhoto,
  };
}
