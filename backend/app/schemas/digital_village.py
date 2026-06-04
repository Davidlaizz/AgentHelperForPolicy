from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ServiceCaseResponse(BaseModel):
    id: str
    title: str
    case_type: str
    subject: str | None = None
    region: str | None = None
    stage: str | None = None
    description: str | None = None
    materials: list | dict | None = None
    steps: list | dict | None = None
    department: str | None = None
    risk: str | None = None
    tips: list | dict | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceCaseCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    case_type: str = Field(min_length=1, max_length=100)
    subject: str | None = None
    region: str | None = None
    stage: str | None = None
    description: str | None = None
    materials: list | dict | None = None
    steps: list | dict | None = None
    department: str | None = None
    risk: str | None = None
    tips: list | dict | None = None


class ServiceCaseUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    case_type: str | None = None
    subject: str | None = None
    region: str | None = None
    stage: str | None = None
    description: str | None = None
    materials: list | dict | None = None
    steps: list | dict | None = None
    department: str | None = None
    risk: str | None = None
    tips: list | dict | None = None
    status: str | None = None


class AgricultureDiagnosisResponse(BaseModel):
    id: str
    problem: str
    category: str
    diagnosis: str | None = None
    solution: str | None = None
    digital_direction: str | None = None
    policy_links: list | dict | None = None
    pain_points: list | dict | None = None
    actors: list | dict | None = None
    steps: list | dict | None = None
    metrics: list | dict | None = None
    risks: list | dict | None = None
    project_value: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgricultureDiagnosisCreateRequest(BaseModel):
    problem: str = Field(min_length=1, max_length=500)
    category: str = Field(min_length=1, max_length=100)
    diagnosis: str | None = None
    solution: str | None = None
    digital_direction: str | None = None
    policy_links: list | dict | None = None
    pain_points: list | dict | None = None
    actors: list | dict | None = None
    steps: list | dict | None = None
    metrics: list | dict | None = None
    risks: list | dict | None = None
    project_value: str | None = None


class AgricultureDiagnosisUpdateRequest(BaseModel):
    problem: str | None = Field(default=None, min_length=1, max_length=500)
    category: str | None = None
    diagnosis: str | None = None
    solution: str | None = None
    digital_direction: str | None = None
    policy_links: list | dict | None = None
    pain_points: list | dict | None = None
    actors: list | dict | None = None
    steps: list | dict | None = None
    metrics: list | dict | None = None
    risks: list | dict | None = None
    project_value: str | None = None
    status: str | None = None
