import React, { useEffect, useMemo, useState } from "react";
import styles from "./HostReservations.module.css";
import spinner from "../../images/spinnner.gif";
import { getAccessToken } from "../../services/getAccessToken.js";
import getReservationsFromToken from "./services/getReservationsFromToken.js";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const normalizeStatus = (status) => {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes("paid")) return "PAID";
  if (s.includes("await")) return "AWAITING_PAYMENT";
  if (s.includes("fail")) return "FAILED";
  return status.toUpperCase();
};

const labelMap = {
  PAID: "Paid",
  AWAITING_PAYMENT: "Awaiting payment",
  FAILED: "Failed",
};

const HostReservations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("ALL");

  const authToken = getAccessToken();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getReservationsFromToken(authToken);
        let flat = [];

        data.forEach((property) => {
          const reservations = property.res?.response || [];

          reservations.forEach((r) => {
            flat.push({
              ...r,
              id: r.bookingId || r.id,
              bookingId: r.bookingId || r.id,
              status: normalizeStatus(r.status),
              title: property.title,
              city: property.city,
              country: property.country,
              image: property.image,
            });
          });
        });

        setBookings(flat);
      } catch (err) {
        console.error(err);
        setBookings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authToken]);

  const filteredBookings = useMemo(() => {
    let result = bookings;

    if (activeTab !== "ALL") {
      result = result.filter((b) => b.status === activeTab);
    }

    if (search) {
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(search.toLowerCase()) ||
          b.city?.toLowerCase().includes(search.toLowerCase()) ||
          b.guestname?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (range !== "ALL") {
      const now = new Date();

      result = result.filter((b) => {
        const date = new Date(b.arrivaldate || b.createdAt);
        const diffDays = Math.abs((now - date) / (1000 * 60 * 60 * 24));

        if (range === "7") return diffDays <= 7;
        if (range === "30") return diffDays <= 30;
        if (range === "90") return diffDays <= 90;
        if (range === "365") return diffDays <= 365;

        return true;
      });
    }

    result = [...result].sort(
      (a, b) => new Date(a.arrivaldate) - new Date(b.arrivaldate)
    );

    return result;
  }, [bookings, activeTab, search, range]);

  const count = (type) =>
    bookings.filter((b) => (type === "ALL" ? true : b.status === type)).length;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

  const getNights = (a, d) =>
    Math.round((new Date(d) - new Date(a)) / (1000 * 60 * 60 * 24));

  const handleMessage = (b, e) => {
    e.stopPropagation();
    navigate("/hostdashboard/messages", { state: { guestId: b.guestId } });
  };

  const handleReminder = (b, e) => {
    e.stopPropagation();
    navigate(`/hostdashboard/reservation/${b.bookingId}`);
  };

  const handleResolve = (b, e) => {
    e.stopPropagation();
    navigate(`/hostdashboard/reservation/${b.bookingId}`);
  };

  if (isLoading) return <img src={spinner} className={styles.loader} />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Reservations</h1>
      <p className={styles.subtitle}>Manage your bookings and guest stays</p>

      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FiSearch className={styles.searchIcon} />
          <input
            placeholder="Search guest, property, or reservation ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.dropdown}
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          <option value="ALL">All</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === "ALL" ? styles.active : ""}
          onClick={() => setActiveTab("ALL")}
        >
          All ({count("ALL")})
        </button>

        <button
          className={activeTab === "PAID" ? styles.active : ""}
          onClick={() => setActiveTab("PAID")}
        >
          Upcoming ({count("PAID")})
        </button>

        <button
          className={activeTab === "AWAITING_PAYMENT" ? styles.active : ""}
          onClick={() => setActiveTab("AWAITING_PAYMENT")}
        >
          Awaiting payment ({count("AWAITING_PAYMENT")})
        </button>

        <button
          className={activeTab === "FAILED" ? styles.active : ""}
          onClick={() => setActiveTab("FAILED")}
        >
          Failed ({count("FAILED")})
        </button>
      </div>

      <div className={styles.list}>
        {filteredBookings.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
            {bookings.length === 0
              ? "No reservations yet"
              : "No bookings match your filters"}
          </div>
        )}

        {filteredBookings.map((b) => (
          <div
            key={b.id}
            className={styles.card}
            onClick={() =>
              navigate(`/hostdashboard/reservation/${b.bookingId}`)
            }
          >
            <div className={styles.imageWrapper}>
              <img src={b.image} className={styles.image} />
            </div>

            <div className={styles.content}>
              <div className={styles.header}>
                <h3>{b.title}</h3>

                <span
                  className={`${styles.status} ${
                    b.status === "PAID"
                      ? styles.success
                      : b.status === "AWAITING_PAYMENT"
                      ? styles.warning
                      : styles.error
                  }`}
                >
                  {labelMap[b.status]}
                </span>
              </div>

              <p className={styles.location}>
                📍 {b.city}, {b.country}
              </p>

              <p className={styles.dates}>
                {formatDate(b.arrivaldate)} → {formatDate(b.departuredate)} (
                {getNights(b.arrivaldate, b.departuredate)} nights)
              </p>

              <div className={styles.actions}>
                {b.status === "PAID" && (
                  <button
                    className={styles.primary}
                    onClick={(e) => handleMessage(b, e)}
                  >
                    Message guest
                  </button>
                )}

                {b.status === "AWAITING_PAYMENT" && (
                  <>
                    <button
                      className={styles.primary}
                      onClick={(e) => handleReminder(b, e)}
                    >
                      Send reminder
                    </button>
                    <button
                      className={styles.secondary}
                      onClick={(e) => handleMessage(b, e)}
                    >
                      Message guest
                    </button>
                  </>
                )}

                {b.status === "FAILED" && (
                  <>
                    <button
                      className={styles.primary}
                      onClick={(e) => handleResolve(b, e)}
                    >
                      Resolve issue
                    </button>
                    <button
                      className={styles.secondary}
                      onClick={(e) => handleMessage(b, e)}
                    >
                      Message guest
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HostReservations;