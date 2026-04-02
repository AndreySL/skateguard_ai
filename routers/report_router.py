from fastapi import APIRouter
from fastapi.responses import FileResponse
from utils.history import load_history
from utils.reports import generate_pdf_report, generate_excel_report

router = APIRouter()

@router.get("/report/pdf")
async def get_pdf():
    path = generate_pdf_report(load_history())
    return FileResponse(path, filename="skateguard_report.pdf")

@router.get("/report/excel")
async def get_excel():
    path = generate_excel_report(load_history())
    return FileResponse(path, filename="skateguard_report.xlsx")