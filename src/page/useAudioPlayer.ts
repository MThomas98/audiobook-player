import { useEffect, useRef, useState } from "react";

import type { Seconds } from "../shared/types";

export function useAudioPlayer()
{
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState<Seconds>(0);
    const [duration, setDuration] = useState<Seconds>(NaN);

    const audio = audioRef.current;

    function togglePlay()
    {
        if (!audio)
        {
            return;
        }

        if (isPlaying)
        {
            audio.play();
        }
        else
        {
            audio.pause();
        }
    }

    function seek(seconds: Seconds)
    {
        if (!audio || !Number.isFinite(seconds))
        {
            return;
        }

        audio.currentTime = seconds;
    }

    useEffect(() =>
    {
        if (!audio)
        {
            return;
        }

        function handlePlay()
        {
            setIsPlaying(true);
        }
        audio.addEventListener("play", handlePlay);

        function handlePause()
        {
            setIsPlaying(false);
        }
        audio.addEventListener("pause", handlePause);

        function handleTimeUpdate()
        {
            setPosition(audio ? audio.currentTime : 0);
        }
        audio.addEventListener("timeupdate", handleTimeUpdate);

        function handleDurationChange()
        {
            setDuration(audio ? audio.duration : NaN);
        }
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
