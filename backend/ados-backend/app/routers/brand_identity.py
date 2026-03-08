# app/routers/brand_identity.py
"""Brand identity assets (logos/media) per user – persisted in DB."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, UserBrandAsset

router = APIRouter()


class AddBrandAssetRequest(BaseModel):
    name: str
    type: str  # logo | media
    data_url: str
    mime_type: Optional[str] = None


@router.get("/")
async def list_assets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all brand assets for the current user."""
    rows = (
        db.query(UserBrandAsset)
        .filter(UserBrandAsset.user_id == current_user.user_id)
        .order_by(UserBrandAsset.created_at.asc())
        .all()
    )
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "type": r.type,
            "dataUrl": r.data_url,
            "mimeType": r.mime_type or None,
        }
        for r in rows
    ]


@router.post("/")
async def add_asset(
    request: AddBrandAssetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a brand asset (logo or media). Max ~6MB base64 per asset recommended."""
    asset_type = (request.type or "media").lower()
    if asset_type not in ("logo", "media"):
        asset_type = "media"
    name = (request.name or "asset").strip() or "asset"
    if not request.data_url or not request.data_url.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="data_url is required")
    # Optional: cap size (e.g. 8MB base64 ~ 6MB binary)
    if len(request.data_url) > 12 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset too large (max ~8MB).")
    row = UserBrandAsset(
        user_id=current_user.user_id,
        name=name,
        type=asset_type,
        data_url=request.data_url.strip(),
        mime_type=request.mime_type,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": str(row.id),
        "name": row.name,
        "type": row.type,
        "dataUrl": row.data_url,
        "mimeType": row.mime_type,
    }


@router.delete("/{asset_id}")
async def remove_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a brand asset by id (must belong to current user)."""
    from uuid import UUID
    try:
        uid = UUID(asset_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid asset id")
    row = (
        db.query(UserBrandAsset)
        .filter(UserBrandAsset.id == uid, UserBrandAsset.user_id == current_user.user_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
