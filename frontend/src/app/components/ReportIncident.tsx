import { useState } from "react";
import {
  FileText,
  MapPin,
  Clock,
  User,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Send,
} from "lucide-react";

export function ReportIncident() {
  const [formData, setFormData] = useState({
    victimName: "",
    victimAge: "",
    victimPhone: "",
    location: "",
    incidentDate: "",
    incidentTime: "",
    snakeDescription: "",
    additionalNotes: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    setIsSubmitted(true);

    setTimeout(() => {
      setIsSubmitted(false);
    }, 3000);
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setFormData({
        ...formData,
        location: `${pos.coords.latitude.toFixed(
          5
        )}, ${pos.coords.longitude.toFixed(5)}`,
      });
    });
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-8 bg-[#f6f3ee] min-h-screen">

      {/* 🚨 ALERT BAR */}
      {/* <div className="bg-red-500 text-white text-center py-2 rounded mb-6 text-sm font-medium">
        🚨 EMERGENCY? Call 108 | This form is NOT for emergency use
      </div> */}

      {isSubmitted ? (
        <div className="bg-white border shadow-md rounded-xl p-10 text-center">
          <CheckCircle2 className="mx-auto text-green-600 mb-3" size={40} />
          <h2 className="text-xl font-semibold mb-2">
            Report Submitted Successfully
          </h2>
          <p className="text-gray-600 text-sm">
            Emergency services have been notified.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid md:grid-cols-2 gap-6">

            {/* LEFT SIDE */}
            <div className="space-y-6">

              {/* Victim Info */}
              <div className="bg-white border shadow-md rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-blue-600" />
                  <h2 className="font-semibold">Victim Information</h2>
                </div>

                <div className="space-y-4">
                  <input
                    name="victimName"
                    placeholder="Full Name"
                    value={formData.victimName}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />

                  <input
                    name="victimAge"
                    placeholder="Age"
                    type="number"
                    value={formData.victimAge}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />

                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      name="victimPhone"
                      placeholder="Phone Number"
                      value={formData.victimPhone}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-3 py-2 pl-9"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white border shadow-md rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="text-orange-600" />
                  <h2 className="font-semibold">Location</h2>
                </div>

                <div className="flex gap-2">
                  <input
                    name="location"
                    placeholder="Enter location"
                    value={formData.location}
                    onChange={handleChange}
                    className="flex-1 border rounded-lg px-3 py-2"
                    required
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="bg-green-600 text-white px-3 rounded-lg"
                  >
                    <Navigation size={16} />
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT SIDE */}
            <div className="space-y-6">

              {/* Date & Time */}
              <div className="bg-white border shadow-md rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-purple-600" />
                  <h2 className="font-semibold">Date & Time</h2>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      type="date"
                      name="incidentDate"
                      value={formData.incidentDate}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-3 py-2 pl-9"
                      required
                    />
                  </div>

                  <input
                    type="time"
                    name="incidentTime"
                    value={formData.incidentTime}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>

              {/* Snake Description */}
              <div className="bg-white border shadow-md rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="text-green-600" />
                  <h2 className="font-semibold">Snake Description</h2>
                </div>

                <textarea
                  name="snakeDescription"
                  value={formData.snakeDescription}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Color, size, pattern..."
                />
              </div>

            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border shadow-md rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText />
              <h2 className="font-semibold">Additional Notes</h2>
            </div>

            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={4}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Symptoms, first aid, etc..."
            />
          </div>

          {/* SUBMIT */}
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl flex justify-center items-center gap-2">
            <Send size={16} />
            Submit Report
          </button>

          {/* Disclaimer */}
          <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-lg text-sm">
            ⚠️ This form is for reporting only. Call <b>108</b> in emergencies.
          </div>

        </form>
      )}
    </main>
  );
}