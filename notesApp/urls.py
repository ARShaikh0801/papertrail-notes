from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view()),
    path('auth/login/',    views.LoginView.as_view()),
    path('notes/',         views.NoteListCreateView.as_view()),
    path('notes/<str:note_id>/', views.NoteDetailView.as_view()),
    path('notes/<str:note_id>/lock/', views.NoteLockView.as_view()),
    path('notes/<str:note_id>/unlock/', views.NoteUnlockView.as_view()),
    path('notes/<str:note_id>/remove-lock/', views.NoteRemoveLockView.as_view()),
    path('stats/',         views.StatsView.as_view()),
    path('health/',        views.health_check),
]