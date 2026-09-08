from django.urls import path
from . import views

urlpatterns = [
    path('auth/send-code/', views.SendVerificationCodeView.as_view()),
    path('auth/register/', views.RegisterView.as_view()),
    path('auth/forgot-password/send-code/', views.SendForgotPasswordCodeView.as_view()),
    path('auth/forgot-password/reset/', views.ResetPasswordView.as_view()),
    path('auth/login/',    views.LoginView.as_view()),
    path('notes/',         views.NoteListCreateView.as_view()),
    path('notes/trash/',   views.NoteTrashView.as_view()),
    path('notes/<str:note_id>/restore/', views.NoteRestoreView.as_view()),
    path('notes/<str:note_id>/permanent/', views.NotePermanentDeleteView.as_view()),
    path('notes/<str:note_id>/', views.NoteDetailView.as_view()),
    path('notes/<str:note_id>/lock/', views.NoteLockView.as_view()),
    path('notes/<str:note_id>/unlock/', views.NoteUnlockView.as_view()),
    path('notes/<str:note_id>/remove-lock/', views.NoteRemoveLockView.as_view()),
    path('stats/',         views.StatsView.as_view()),
    path('health/',        views.health_check),
]