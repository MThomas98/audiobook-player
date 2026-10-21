import { useEffect, useRef, useState } from "react";

import type { BookID, Progress, Seconds } from "../shared/types";

const SAVE_PROGRESS_INTERVAL: number = 2000;

export type AudioPlayer = ReturnType<typeof useAudioPlayer>;

export interface AudioPlayerProps
{
    bookId: BookID | null;
}

export function useAudioPlayer({ bookId }: AudioPlayerProps)
{
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState<Seconds>(0);
    const [duration, setDuration] = useState<Seconds>(NaN);

    function togglePlay()
    {
        const audio = audioRef.current;
        if (!audio)
        {
            return;
        }

        if (isPlaying)
        {
            audio.pause();
            saveProgress().catch(err => console.error(`Failed to save progress on pause: ${err}`));
        }
        else
        {
            audio.play()
                .catch(err => console.error(`Failed to play audio: ${err}`));
        }
    }

    function seek(seconds: Seconds)
    {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(seconds))
        {
            return;
        }

        seconds = Math.min(Math.max(seconds, 0), audio.duration);

        audio.currentTime = seconds;
    }

    async function saveProgress()
    {
        const audio = audioRef.current;
        if (!audio || !bookId)
        {
            return;
        }

        await window.api.saveProgress({ bookId, position: audio.currentTime });
    }

    async function loadProgress(): Promise<Progress | undefined>
    {
        if (!bookId)
        {
            return undefined;
        }

        return window.api.getProgress(bookId);
    }

    useEffect(() =>
    {
        const audio = audioRef.current;

        if (!audio)
        {
            return;
        }

        const handlePlay = () => setIsPlaying(true);
        audio.addEventListener("play", handlePlay);

        const handlePause = () => setIsPlaying(false);
        audio.addEventListener("pause", handlePause);

        const handleTimeUpdate = () => setPosition(audio.currentTime);
        audio.addEventListener("timeupdate", handleTimeUpdate);

        const handleDurationChange = () => setDuration(audio.duration);
        audio.addEventListener("durationchange", handleDurationChange);

        let isCancelled = false;

        const handleLoad = async () =>
        {
            let progress: Progress | undefined;
            try
            {
                progress = await loadProgress();
            }
            catch (err)
            {
                console.error(`Failed to load progress: ${err}`);
            }

            // The book changed while waiting, so the audio element now belongs to another book
            if (isCancelled)
            {
                return;
            }

            if (progress !== undefined)
            {
                seek(progress.position);
            }

            audio.play().catch(err => console.error(`Failed to play audio: ${err}`));
        };
        audio.addEventListener("loadedmetadata", handleLoad);

        const saveInterval = setInterval(() =>
        {
            if (!audio.paused)
            {
                saveProgress().catch(err => console.error(`Failed to save progress: ${err}`));
            }
        }, SAVE_PROGRESS_INTERVAL);

        return () =>
        {
            isCancelled = true;

            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("durationchange", handleDurationChange);
            audio.removeEventListener("loadedmetadata", handleLoad);

            clearInterval(saveInterval);
        };
    }, [bookId]);

    return {
        audioRef, isPlaying, position, duration,
        togglePlay, seek, saveProgress,
    };
}
