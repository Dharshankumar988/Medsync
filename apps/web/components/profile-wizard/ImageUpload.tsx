"use client";

import React, { useState, useRef } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@medsync/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@medsync/ui";
import { Upload, X, Crop as CropIcon } from "lucide-react";

interface ImageUploadProps {
  onUpload: (fileUrl: string) => void;
  label?: string;
  isCover?: boolean;
}

export function ImageUpload({ onUpload, label = "Upload Image", isCover = false }: ImageUploadProps) {
  const [upImg, setUpImg] = useState<any>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setUpImg(reader.result);
        setIsModalOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const aspect = isCover ? 16 / 9 : 1;
    setCrop({
      unit: '%',
      width: 50,
      height: 50,
      x: 25,
      y: 25
    });
  };

  const getCroppedImg = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    const base64Image = canvas.toDataURL("image/jpeg");
    setPreviewUrl(base64Image);
    setIsModalOpen(false);
    onUpload(base64Image); // Simulating upload by returning base64
  };

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className={`relative overflow-hidden ${isCover ? "h-32 w-full rounded-lg" : "h-24 w-24 rounded-full"} border border-border group`}>
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <Button variant="ghost" size="icon" className="text-white" onClick={() => setPreviewUrl(null)}>
                <X className="h-5 w-5" />
             </Button>
          </div>
        </div>
      ) : (
        <label className={`cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 hover:bg-muted/50 transition-colors ${isCover ? "h-32 w-full rounded-lg" : "h-24 w-24 rounded-full"}`}>
          <Upload className="h-6 w-6 text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
        </label>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col items-center justify-center max-h-[400px] overflow-hidden bg-black/5 rounded-md">
            {upImg && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={isCover ? 16 / 9 : 1}
                circularCrop={!isCover}
              >
                <img 
                  ref={imgRef} 
                  src={upImg} 
                  alt="Upload" 
                  className="max-h-[350px] w-auto object-contain"
                  onLoad={onLoad} 
                />
              </ReactCrop>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={getCroppedImg}>
              <CropIcon className="h-4 w-4 mr-2" /> Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
