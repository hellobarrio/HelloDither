"use client";

import * as React from "react";
import { useDropzone, type Accept } from "react-dropzone";

interface DropzoneProps {
  accept: Accept;
  onFile: (file: File) => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
  maxSize?: number;
}

export function Dropzone({
  accept,
  onFile,
  icon,
  label,
  hint,
  maxSize,
}: DropzoneProps) {
  const onDrop = React.useCallback(
    (accepted: File[]) => {
      const f = accepted[0];
      if (f) onFile(f);
    },
    [onFile],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    onDrop,
    maxSize,
  });
  return (
    <div
      {...getRootProps()}
      className={"dropzone" + (isDragActive ? " active" : "")}
    >
      <input {...getInputProps()} />
      {icon}
      <div>{label}</div>
      <div className="hint">{hint}</div>
    </div>
  );
}
