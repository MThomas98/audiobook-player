import { useEffect, useRef, useState } from "react";

import type { Seconds } from "../shared/types";

export function useAudioPlayer()
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

        console.log(`togglePlay(): isPlaying=${isPlaying}`);

        if (isPlaying)
        {
            audio.pause();
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

        audio.currentTime = seconds;
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

        return () =>
        {
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("durationchange", handleDurationChange);
        };
    }, []);

    return {
        audioRef, isPlaying, position, duration,
        togglePlay, seek,
    };
}
